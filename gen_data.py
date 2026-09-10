import os
import random
from datetime import datetime, timedelta

os.makedirs('public/data', exist_ok=True)


def trading_minutes(n_candles):
    dt = datetime(2024, 1, 1, 9, 15)
    times = []
    while len(times) < n_candles:
        h, m = dt.hour, dt.minute
        mins = h * 60 + m
        if 9 * 60 + 15 <= mins <= 15 * 60 + 25:
            times.append(dt)
            dt += timedelta(minutes=5)
        else:
            dt = datetime(dt.year, dt.month, dt.day, 9, 15) + timedelta(days=1)
    return times


def gen_csv(symbol, base, seed):
    rng = random.Random(seed)
    times = trading_minutes(500)
    price = base
    rows = ['time,open,high,low,close,volume']
    for t in times:
        open_ = round(price, 2)
        change = (rng.random() - 0.49) * price * 0.008
        close = round(price + change, 2)
        high = round(max(open_, close) + rng.random() * price * 0.003, 2)
        low = round(min(open_, close) - rng.random() * price * 0.003, 2)
        vol = rng.randint(5000, 50000)
        rows.append('{},{},{},{},{},{}'.format(
            t.strftime('%Y-%m-%d %H:%M'), open_, high, low, close, vol
        ))
        price = close
    with open('public/data/{}.csv'.format(symbol), 'w') as f:
        f.write('\n'.join(rows))
    print('Generated {}.csv ({} rows)'.format(symbol, len(times)))


gen_csv('RELIANCE', 2800.0, 42)
gen_csv('TCS', 3900.0, 77)
gen_csv('INFY', 1600.0, 13)
print('All done!')
