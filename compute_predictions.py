import numpy as np

# Real data from DB
data = {
    'Amman': {2018:12147, 2019:30093, 2020:24577, 2021:15773, 2022:11675, 2023:13495, 2024:20824, 2025:9180},
    'Irbid': {2018:7859,  2019:19003, 2020:18152, 2021:12141, 2022:7075,  2023:6464,  2024:12316, 2025:4994},
    "Ma'an": {2018:1827,  2019:2340,  2020:2644,  2021:1343,  2022:972,   2023:1659,  2024:1603,  2025:1212},
}

years_train = np.array([2018,2019,2020,2021,2022,2023,2024,2025])

# Use last-3-year average as baseline, then apply trend from last 2 years
for region, counts in data.items():
    vals = [counts[yr] for yr in years_train]
    avg3 = np.mean(vals[-3:])  # 2023-2025 average
    # YoY change from 2023->2024->2025
    slope = np.mean([vals[-1]-vals[-2], vals[-2]-vals[-3]])
    
    p2026 = max(500, int(round(avg3 + slope * 1, -2)))
    p2027 = max(500, int(round(avg3 + slope * 2, -2)))
    p2028 = max(500, int(round(avg3 + slope * 3, -2)))
    
    baseline = counts[2025]
    trend = round((p2028 - baseline) / baseline * 100, 1)
    print(f"{region}: 2025={baseline}, 2026={p2026}, 2027={p2027}, 2028={p2028}, trend={trend}%")
