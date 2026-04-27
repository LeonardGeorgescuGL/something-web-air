# 🌍 Ghidul Complet de Arhitectură și Funcționare: AirWatch București

Acest document explică detaliat modul în care funcționează aplicația ta cap-coadă, trecând prin absolut toate straturile (Frontend, Backend, Machine Learning) și modul în care acestea comunică atât pe PC, cât și pe telefonul mobil. Acest fișier este perfect ca referință pentru a-ți scrie sau susține teza de licență.

---

## 🏗️ 1. Arhitectura Generală (Big Picture)

Aplicația are o arhitectură modernă de tip **Microservicii** formată din 3 piloni principali care rulează simultan și comunică între ei:

1. **Frontend-ul (React + Vite)** - Interfața cu care interacționează utilizatorul.
2. **Backend-ul principal (Java Spring Boot)** - "Creierul" operațional, legătura cu Baza de Date și ruterul central.
3. **Microserviciul de ML (Python FastAPI)** - Motorul de predicție și analiză avansată a datelor.

### Cum decurge o cerere de date?
* Utilizatorul deschide harta pe telefon (Frontend).
* Frontend-ul cere senzorii de la Backend (`/api/air-quality/sensors`).
* Backend-ul calculează indicii AQI (formula EPA), trimite datele la Python pentru a forma **Clusterele K-Means** și așteaptă răspunsul.
* Backend-ul primește datele îmbogățite cu clustere de la Python și le întoarce la Frontend.
* Frontend-ul le desenează vizual (cu culori) pe hartă folosind biblioteca Leaflet.

---

## 🎨 2. Frontend-ul (React.js + TypeScript + TailwindCSS)
**Rol:** Să ofere o experiență vizuală interactivă, responsivă (adaptabilă pe mobil/PC) și rapidă.

### Componente Majore:
* **`MapInterface.tsx`**: Harta principală. Folosește `react-leaflet` pentru a afișa senzorii. La apăsarea unui senzor, afișează informații (AQI, PM2.5) preluate din DB. Pe telefon, Sidebar-ul (meniul) se transformă într-un sertar plutitor (`z-index: 2000`) pentru a nu strica ecranul.
* **`HistoricalDataInterface.tsx`**: Se ocupă cu randarea graficelor (`recharts`). Aici primești datele de la modelul *Facebook Prophet* și se afișează evoluția și predictibilitatea aerului.
* **`CommunityAlertInterface.tsx`**: Modulul de Raportare Civică. Membrii comunității pot trimite rapoarte text sau foto.
* **`LeaderboardInterface.tsx`**: Modulul de Gamification. Afișează topul utilizatorilor pe baza punctelor adunate, insigne și statusul de "Profil Verificat".

### Adaptabilitatea PC vs. Mobil:
* Am folosit clase specifice din TailwindCSS (ex: `flex-col md:flex-row`). Prefixul `md:` înseamnă "pe ecrane medii/PC aplică această regulă". Fără el, se aplică regula pentru telefon.
* **Vite Proxy:** Pentru ca aplicația să funcționeze pe telefon, am modificat `vite.config.ts`. Astfel, când intri de pe rețeaua Wi-Fi (IP-ul local), frontend-ul rutează ascuns cererile de `/api` către `localhost:8080`, evitând blocajele de securitate din browser (CORS).

---

## ⚙️ 3. Backend-ul Principal (Java Spring Boot)
**Rol:** Stocare, validare, rurare a regulilor de afaceri și managementul bazei de date.

### Funcționalități Majore:
* **Colectarea Datelor (`AirQualityCollector.java`)**: Preia date externe (ex: API OpenWeatherMap). Aici am implementat formula matematică riguroasă a standardului EPA (Environmental Protection Agency) pentru a converti concentrația de poluant (PM2.5) într-o valoare fixă AQI (0-500).
* **Raportarea Comunitară (Inheritance/Polimorfism)**: Baza de date are o ierarhie complexă. Clasa părinte este `RaportCivic`, din care se extind tabelele copil `RaportText` și `RaportFoto`. În `RaportCivicService.java` am setat logica ce detectează tipul raportului primit din interfață și îl instanțiază/salvează exact în tabela sa corectă, inițializând automat și starea de validare (`ValidareRaport`).
* **Securitatea (CORS)**: În `SecurityConfig.java` ne-am asigurat că doar rețeaua locală și traficul acceptat au acces la baza ta de date (setând originile permise și autentificarea).
* **Baza de Date**: Folosim JPA / Hibernate pentru a abstractiza query-urile SQL. Clasele din folderul `model/` definesc structura exactă a tabelelor.

---

## 🤖 4. Microserviciul de Machine Learning (Python FastAPI)
**Rol:** Integrarea metodelor științifice și matematice avansate (K-Means, Prophet) pentru interpretarea invizibilă a datelor. Rulează separat pe portul `8000`.

### Modulul de Clusterizare (K-Means):
* **Ce face:** Primește o listă de senzori (cu valorile lor de AQI și PM2.5) de la Java.
* **Cum funcționează:** Folosind algoritmul nesupervizat K-Means din biblioteca `scikit-learn`, grupează aceste puncte în exact **3 clustere** (ex: Risc Moderat, Ridicat, Sever) pe baza "distanței" matematice dintre valori.
* **Unde se vede:** Pe `MapInterface.tsx`, sub formă de zone colorate diferit pentru a alerta utilizatorii.

### Modulul de Prognoză (Facebook Prophet):
* **Ce face:** Primește date istorice (pe minim 14 zile) dintr-o anumită zonă și încearcă să anticipeze viitorul (pe 7, 14, 30 zile).
* **Cum funcționează:** Algoritmul Facebook Prophet excelează la descoperirea sezonalității (valori mai mari iarna, mai mici noaptea etc.). Antrenează un model liniar pe loc cu datele trimise din Java, generează punctele viitoare și calculează erorile matematice:
  * **MAE (Eroarea Medie Absolută)**
  * **RMSE (Eroarea Pătratică Medie)**
  * **MAPE (Eroarea Procentuală Absolută)**
  * **R² (Scorul de încredere / bonitate)** - care arată procentual (0-100%) cât de bine înțelege modelul datele.
* **Unde se vede:** Pe `HistoricalDataInterface.tsx`, în graficele continue cu linie violet punctată, având afișați indicatorii textuali pentru comisia de evaluare.

---

## 🔒 5. Cum am integrat Securitatea (Fișierele .env)
Ca best-practice pentru producție și pentru teza ta, niciodată nu ținem parole (cum ar fi OpenWeatherMap API Key sau parola bazei de date) direct în cod. 
* Acestea se țin într-un fișier `.env` aflat pe propriul tău calculator.
* Acest fișier a fost adăugat în `.gitignore` – ceea ce îi spune git-ului: "Niciodată nu urca acest fișier pe GitHub, e secretul meu".
* Astfel, când profesorii sau alte persoane vor analiza repository-ul pe GitHub, arhitectura ta va arăta extrem de profesional, fără breșe de securitate (evitând acele alerte de "Leaked Secrets").

---
**Concluzie:** 
*AirWatch București* este un ecosistem matur. Utilizează Spring Boot pentru robustețe, React pentru performanța vizuală și FastAPI pentru inteligența artificială. Folosind concepte precum Proxying, CORS routing, Polimorfism în DB și modelare ML on-the-fly, aplicația respectă standardele stricte de Enterprise Software Architecture din ziua de azi.
