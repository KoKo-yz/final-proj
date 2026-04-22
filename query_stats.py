import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models.incident import FireIncident
from sqlalchemy import func

db = SessionLocal()
res = db.query(
    FireIncident.governorate,
    FireIncident.year,
    func.count(FireIncident.id).label('c')
).filter(
    FireIncident.year.isnot(None),
    FireIncident.governorate.isnot(None)
).group_by(
    FireIncident.governorate, FireIncident.year
).order_by(
    FireIncident.governorate, FireIncident.year
).all()

for r in res:
    print(r)
db.close()
