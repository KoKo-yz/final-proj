# 🌲 Forest Fire Prediction & Risk Mapping System for Jordan

> **AI-powered early warning system for fire and safety engineering**  
> Prince Al Hussein Bin Abdallah II Academy - Fire and Safety Engineering  
> Graduation Project 2025

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Project Overview

This system predicts and maps forest fire risks across Jordan using machine learning. By analyzing **120,000+ fire incident records** from 2018-2025, it provides actionable insights for civil protection authorities.

### ✨ Key Features

- 🗺️ **Interactive Fire Map** - View all incidents with clustering and heatmap visualization
- 📊 **Risk Prediction Dashboard** - Predict fire risk for any region and month using AI
- 🤖 **ML Model Comparison** - Evaluate performance of different algorithms
- 📈 **Statistical Analysis** - Analyze trends by year, month, type, and location
- 📱 **Mobile Responsive** - Works on desktop, tablet, and mobile devices

---

## 👥 Team

**Students:**
- Hashem
- Yazan
- Yousef
- Ahmad
- Saif
- Mustafa

**Supervisor:** Dr. Diana Rbehat

**Institution:** Prince Al Hussein Bin Abdallah II Academy - Fire and Safety Engineering

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- pip (Python package manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/forest-fire-prediction-jordan.git
   cd forest-fire-prediction-jordan
   ```

2. **Create virtual environment (recommended)**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Mac/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Load your fire incident data**
   ```bash
   # For CSV files
   python scripts/load_data.py --file path/to/your/data.csv

   # For Excel files
   python scripts/load_data.py --file path/to/your/data.xlsx --sheet Sheet1
   ```

5. **Run the application**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

6. **Open in browser**
   ```
   http://localhost:8000
   ```

---

## 📁 Project Structure

```
forest-fire-prediction-jordan/
├── app/
│   ├── main.py                 # FastAPI application entry point
│   ├── config.py               # Configuration settings
│   ├── database.py             # Database connection and setup
│   ├── prediction.py           # ML prediction service
│   ├── models/
│   │   └── incident.py         # Fire incident database model
│   ├── routers/
│   │   ├── pages.py            # Web page routes
│   │   └── api.py              # REST API endpoints
│   ├── static/
│   │   ├── css/
│   │   │   └── main.css        # Main stylesheet
│   │   └── js/
│   │       ├── main.js         # Shared utilities
│   │       ├── map.js          # Interactive map logic
│   │       ├── dashboard.js    # Dashboard charts
│   │       └── models.js       # Model performance viz
│   ├── templates/
│   │   ├── base.html           # Base HTML template
│   │   ├── index.html          # Main map page
│   │   ├── dashboard.html      # Risk prediction dashboard
│   │   ├── models.html         # Model performance page
│   │   └── about.html          # About page
│   └── models/                 # Pre-trained ML models (.pkl)
│       ├── random_forest.pkl
│       ├── xgboost.pkl
│       ├── svm.pkl
│       └── neural_network.pkl
├── data/
│   └── fire_incidents.db       # SQLite database (auto-created)
├── scripts/
│   └── load_data.py            # Data loading script
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

---

## 🗄️ Data Requirements

### Expected Data Format

Your fire incident data should include (column names may vary):

| Column | Description | Required |
|--------|-------------|----------|
| x_cord | X coordinate (Jordan TM) | Yes* |
| y_cord | Y coordinate (Jordan TM) | Yes* |
| latitude | Latitude (WGS84) | Yes* |
| longitude | Longitude (WGS84) | Yes* |
| fire_type | "Forest" or "Grassland" | No |
| date | Incident date | No |
| year | Year | No |
| month | Month (1-12) | No |
| governorate | Region name | No |
| district | District | No |
| area_name | Specific area | No |

*Either projected coordinates (x_cord, y_cord) OR lat/lon must be present.

### Coordinate Conversion

If your data uses Jordan Transverse Mercator (JTM) coordinates, the system will automatically convert them to WGS84 (latitude/longitude) using `pyproj`.

---

## 🤖 ML Models

### Supported Models

- **Random Forest** - Robust ensemble method
- **XGBoost** - Gradient boosting (typically highest accuracy)
- **SVM** - Support Vector Machine
- **Neural Network** - Deep learning approach

### Using Pre-trained Models

Place your trained `.pkl` model files in `app/models/`. The system will automatically load them.

### Fallback Mode

If no models are available, the system uses **statistical analysis of historical patterns** to generate risk predictions.

---

## 🌐 API Endpoints

### Data Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/incidents` | Get fire incidents with filters |
| `GET /api/incidents/heatmap` | Get aggregated heatmap data |
| `GET /api/statistics/overview` | Get overview statistics |
| `GET /api/statistics/monthly` | Get monthly statistics |
| `GET /api/statistics/governorates` | Get governorate stats |

### Prediction Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/predict` | Predict fire risk for region/month |
| `GET /api/models/performance` | Get model performance metrics |
| `GET /api/models/feature-importance` | Get feature importance |

### Example: Prediction Request

```bash
curl -X POST "http://localhost:8000/api/predict?governorate=Ajloun&month=7&temperature=32&humidity=25"
```

Response:
```json
{
  "governorate": "Ajloun",
  "month": 7,
  "year": 2025,
  "risk_level": "High",
  "risk_score": 78.5,
  "confidence": 0.85,
  "color": "#ef4444",
  "model": "historical_patterns"
}
```

---

## 🎨 Technology Stack

### Backend
- **Python 3.10+**
- **FastAPI** - Modern async web framework
- **SQLAlchemy** - Database ORM
- **SQLite** - Lightweight database
- **pyproj** - Coordinate transformation

### Frontend
- **HTML5/CSS3** - Modern web standards
- **Bootstrap 5** - Responsive framework
- **Leaflet** - Interactive maps
- **Leaflet.markercluster** - Marker clustering
- **Chart.js** - Data visualization

### Machine Learning
- **scikit-learn** - ML algorithms
- **XGBoost** - Gradient boosting
- **pandas** - Data manipulation
- **numpy** - Numerical computing

---

## 🚀 Deployment

### Render (Recommended for Backend)

1. Push code to GitHub
2. Create new Web Service on [Render](https://render.com/)
3. Connect your repository
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables as needed

### PythonAnywhere

1. Create web app with Flask
2. Upload project files
3. Configure WSGI file to import FastAPI app
4. Set up database

---

## 📝 Development

### Run in Development Mode

```bash
uvicorn app.main:app --reload --debug
```

### Database Reset

```bash
# Delete the database file
rm data/fire_incidents.db

# Reload data
python scripts/load_data.py --file path/to/data.csv
```

---

## 🐛 Troubleshooting

**Issue: Database not created**
- Check that `data/` directory exists
- Ensure write permissions

**Issue: No incidents showing on map**
- Verify data was loaded successfully
- Check coordinate conversion
- Look for console errors

**Issue: Models not loading**
- Verify `.pkl` files are in `app/models/`
- Check Python version compatibility

---

## 📄 License

This project is for educational purposes as part of a graduation project.

---

## 📞 Contact

For questions or support, contact the project team or supervisor Dr. Diana Rbehat.

---

**Built with ❤️ for Jordan's Fire and Safety Engineering**
