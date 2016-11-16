from os import makedirs, path

data_path = 'data'
makedirs(data_path, exist_ok=True)

raw_interview_path = path.join(data_path, 'raw')
makedirs(raw_interview_path, exist_ok=True)

influence_path = path.join(data_path, 'influence')
makedirs(influence_path, exist_ok=True)

listing_filename = path.join(data_path, 'interviews.json')
