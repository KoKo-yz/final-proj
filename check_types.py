import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models.incident import FireIncident
from sqlalchemy import func

db = SessionLocal()
res = db.query(
    FireIncident.fire_type,
    func.count(FireIncident.id).label('c')
).group_by(FireIncident.fire_type).all()

print("--- Data Distribution ---")
for r in res:
    print(f"Type: '{r[0]}', Count: {r[1]}")

others = db.query(FireIncident).filter(~FireIncident.fire_type.in_(['Forest', 'Grassland'])).count()
print(f"Total 'Other/Unknown' count: {others}")
db.close()
