from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
import warnings

warnings.filterwarnings('ignore')

router = APIRouter()

class ProphetPoint(BaseModel):
    ds: str        # ISO timestamp
    y: float       # valoarea indicatorului

class ProphetRequest(BaseModel):
    data: List[ProphetPoint]
    indicator: str          
    forecast_days: int      

class ForecastPoint(BaseModel):
    date: str
    predicted: float
    lower: float
    upper: float
    confidence: float

class ProphetMetrics(BaseModel):
    mae: float
    rmse: float
    mape: float
    r2: float
    train_size: int
    test_size: int
    quality_label: str   
    quality_score: float 

class ProphetResponse(BaseModel):
    forecast: List[ForecastPoint]
    metrics: ProphetMetrics
    model_info: dict


@router.post("/predict", response_model=ProphetResponse)
def prophet_forecast(req: ProphetRequest):
    """
    Antreneaza un model Facebook Prophet pe date istorice orare,
    evalueaza pe set de test (20%), si genereaza prognoza pentru N zile.
    Returneaza predictiile + metrici de evaluare complete.
    """
    if len(req.data) < 14:
        raise HTTPException(
            status_code=400,
            detail=f"Minim 14 puncte necesare pentru antrenare Prophet. Primit: {len(req.data)}"
        )

    try:
        from prophet import Prophet
    except ImportError:
        raise HTTPException(status_code=500, detail="Prophet nu este instalat in mediul virtual.")

    # ── Pregatire date ──────────────────────────────────────────
    df = pd.DataFrame([{"ds": p.ds, "y": p.y} for p in req.data])
    df["ds"] = pd.to_datetime(df["ds"])
    df = df.sort_values("ds").reset_index(drop=True)
    df = df.drop_duplicates("ds")
    df["y"] = df["y"].clip(lower=0)   # AQI nu poate fi negativ

    # ── Train / Test split: 80% antrenare, 20% testare ─────────
    # Daca avem putine date, micsoram setul de test ca sa ramana destule pt antrenare
    test_ratio = 0.2
    if len(df) < 30:
        test_ratio = 0.1
    
    split_idx = int(len(df) * (1 - test_ratio))
    train_df = df.iloc[:split_idx].copy()
    test_df  = df.iloc[split_idx:].copy()

    if len(train_df) < 5:
        raise HTTPException(status_code=400, detail="Set de antrenare critic de mic (< 5 puncte).")

    # ── Antrenare model Prophet (Evaluare rapida) ──────────────
    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=True,
        daily_seasonality=True,
        seasonality_mode="multiplicative",
        interval_width=0.90,
        uncertainty_samples=0 # Dezactivam esantionarea pt viteza la evaluare
    )
    model.fit(train_df)

    # ── Evaluare pe setul de test ───────────────────────────────
    test_future = model.make_future_dataframe(
        periods=len(test_df),
        freq="H",
        include_history=False
    )
    test_pred = model.predict(test_future)

    test_merged = test_df.copy()
    test_merged = test_merged.set_index("ds")
    test_pred_indexed = test_pred.set_index("ds")["yhat"]
    test_merged = test_merged.join(test_pred_indexed, how="inner")

    y_real = test_merged["y"].values
    y_pred = test_merged["yhat"].values.clip(min=0)

    # ── Calcul metrici ──────────────────────────────────────────
    mae   = float(np.mean(np.abs(y_real - y_pred)))
    rmse  = float(np.sqrt(np.mean((y_real - y_pred) ** 2)))
    mask  = y_real > 1.0
    mape  = float(np.mean(np.abs((y_real[mask] - y_pred[mask]) / y_real[mask])) * 100) if mask.any() else 0.0

    ss_res = np.sum((y_real - y_pred) ** 2)
    ss_tot = np.sum((y_real - np.mean(y_real)) ** 2)
    r2    = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

    # ── Scor calitativ model ─────────────────────────────────────
    if r2 >= 0.85:
        quality_label = "Excelent"
        quality_score = min(1.0, r2)
    elif r2 >= 0.70:
        quality_label = "Bun"
        quality_score = r2
    elif r2 >= 0.50:
        quality_label = "Acceptabil"
        quality_score = r2
    else:
        quality_label = "Slab"
        quality_score = max(0.0, r2)

    # ── Prognoza N zile in viitor ────────────────────────────────
    model_full = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=True,
        daily_seasonality=True,
        seasonality_mode="multiplicative",
        changepoint_prior_scale=0.08,
        interval_width=0.90,
        n_changepoints=min(25, len(df) // 10),
    )
    model_full.fit(df)

    future = model_full.make_future_dataframe(
        periods=req.forecast_days * 24,
        freq="H",
        include_history=False
    )
    forecast = model_full.predict(future)

    forecast["date_only"] = forecast["ds"].dt.date
    daily = forecast.groupby("date_only").agg({
        "yhat": "mean", "yhat_lower": "mean", "yhat_upper": "mean"
    }).reset_index()

    daily = daily.head(req.forecast_days)

    forecast_points = []
    for i, row in daily.iterrows():
        decay = 1.0 - (i * 0.04)
        confidence = max(0.55, min(0.97, quality_score * decay))
        forecast_points.append(ForecastPoint(
            date=str(row["date_only"]) + "T12:00:00",
            predicted=round(max(0, row["yhat"]), 1),
            lower=round(max(0, row["yhat_lower"]), 1),
            upper=round(max(0, row["yhat_upper"]), 1),
            confidence=round(confidence, 3),
        ))

    return ProphetResponse(
        forecast=forecast_points,
        metrics=ProphetMetrics(
            mae=round(mae, 2),
            rmse=round(rmse, 2),
            mape=round(mape, 2),
            r2=round(r2, 4),
            train_size=len(train_df),
            test_size=len(test_df),
            quality_label=quality_label,
            quality_score=round(quality_score, 4),
        ),
        model_info={
            "algorithm": "Facebook Prophet",
            "seasonality_mode": "multiplicative",
            "daily_seasonality": True,
            "weekly_seasonality": True,
            "changepoint_prior_scale": 0.08,
            "interval_width": 0.90,
            "indicator": req.indicator,
            "total_data_points": len(df),
            "forecast_days": req.forecast_days,
        }
    )
