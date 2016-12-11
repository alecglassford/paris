import json

from settings import *

result = {}

with open(listing_filename, 'r') as listing_file:
    listing = json.load(listing_file)

for writer in listing:
    name = writer['writer_name']

    if name in result: # We've already made an entry for this writer
        if 'extra' not in result[name]:
            result[name]['extra'] = []
        if writer['writer_type'] not in result[name]['writer_type']: # weak test, but works
            result[name]['writer_type'] += ', ' + writer['writer_type']
        result[name]['extra'].append(writer['interview_url'])
        continue

    filename = path.join(influence_path, name + '.json')
    with open(filename, 'r') as influences_file:
        influencers = json.load(influences_file)
    result[name] = writer
    result[name]['influencers'] = influencers

# Now get/save reversed links - influencees of each writer
names = set([writer['writer_name'] for writer in listing])
for name in names:
    result[name]['influencees'] = {}
    for other_name in names:
        if other_name == name: continue
        if name in result[other_name]['influencers']:
            result[name]['influencees'][other_name] = result[other_name]['influencers'][name]
    print(name, 'influenced', len(result[name]['influencees']), 'people')

with open(final_filename, 'w') as output:
    json.dump(result, output, ensure_ascii=False, indent=2)
