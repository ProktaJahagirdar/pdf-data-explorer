# PDF Data Extractor App

## 🎯 Project Overview  
This application enables the ingestion of non‑structured PDF documents (rent rolls, marketing flyers, leases) and provides the full pipeline:  
- Uploading Rent Roll or Flyer PDFs  
- Automatically extracting structured data (property name, unit number, unit type, rent amount, etc.)  
- Storing the data in a SQL database for querying  
- Visualizing the original PDF side‑by‑side with the extracted data and field highlights  
- Searching by fields (property name, address, unit count, rent values, etc.)

## 🧩 Why this was built  
To streamline the manual process of reading many PDF documents, extracting key info, and making that data searchable and analyzable. This demo app shows an end‑to‑end pipeline: file ingestion → extraction → storage → visualization & search.

## 🛠️ Built With  
- **Backend**: Node.js, Express  
- **Database**: SQLite (better‑sqlite3)  
- **Python Extraction Engine**: `pdfplumber` / `PyMuPDF` (or mock extraction script)  
- **Frontend**: React, react‑pdf, axios  
- **Other**: JavaScript (ES Modules), HTML, CSS

## 📂 Project Structure

```text
.
├─ backend/
│  ├─ server.js         # Express server, routes, file upload, APIs
│  ├─ database.js       # SQLite connection & schema
│  └─ python/
│     └─ extract.py     # PDF parsing & data extraction (lease & flyer)
│
├─ frontend/
│  └─ src/
│     ├─ api/
│     │  └─ api.js      # Axios helpers (upload, properties, units, search)
│     ├─ components/
│     │  ├─ UploadPDF.jsx
│     │  ├─ PDFViewer.jsx
│     │  └─ SearchBar.jsx
│     └─ App.js         # Main React app layout
│
└─ README.md            # Project documentation
```

## 🚀 Getting Started

### Prerequisites  
- Node.js (v14+ recommended)  
- Python 3.10+  
- On macOS/Ubuntu: install Tesseract & poppler if you plan to use OCR.  
- Optional: Git for version control.

### Setup Backend  
```bash
cd backend
npm install
```

### Run Backend

From the project root:

```
npm start
```
By default the backend listens on: http://localhost:5100

### Install Python dependencies

```
cd python
pip install pdfplumber
cd ..
```

### Run Frontend

In a new terminal, from the project root:

```
cd frontend
npm install
npm start
```

Frontend will open in your browser (typically http://localhost:3000)

### Usage Flow

1. Launch backend & frontend.
    - Backend: node server.js (port 5100)

    - Frontend: npm start (port 3000)

2. On the frontend Upload section: select a lease or Flyer PDF and click Upload & Extract. 

3. The system calls /extract, runs the Python extractor, writes to the DB, and returns extracted structured data.

4. The UI shows:

    - Left side: the original PDF (rendered with react‑pdf)

    - Right side: JSON / structured view of the extracted data

    - Highlights (via overlay) link key fields back to their location in the PDF.

5. In the Search section: you can search (by property name, address, doc_type, rent range, etc) or view all properties via /properties endpoints.

## 🔍 API Endpoints

| Endpoint       | Method | Description                                              |
|----------------|--------|----------------------------------------------------------|
| `/extract`     | POST   | Upload a PDF → extract + store data                      |
| `/properties`  | GET    | Get all properties                                       |
| `/search`      | GET    | Search units with query params (`unit_number`, `min_rent`, `max_rent`) |


Thank you for reviewing this project!  
Feel free to explore the code, run the demo, and suggest improvements.  
Happy coding! 👏


