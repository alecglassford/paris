import csv
from os import makedirs, path
from urllib.parse import urlparse

from bs4 import BeautifulSoup
import requests

decades = range(1950, 2020, 10)
hostname = 'http://www.theparisreview.org'
base_index_url = 'http://www.theparisreview.org/interviews/{}s'

data_path = 'data'
makedirs(data_path, exist_ok=True)
interviews_filename = path.join(data_path, 'interviews.csv')

# /path => http://www.theparisreview.org/path
def proper_url(url):
    parsed = urlparse(url)
    if not parsed.netloc:
        url = hostname + url
    return url

# Return list of (writer_name, interview_url, photo_url) tuples
def get_decade_listing(index_url):
    result = []
    resp = requests.get(index_url)
    if not resp.ok:
        print('Failed to get', index_url)
        return None
    index = BeautifulSoup(resp.text, 'html.parser')
    interviews = index.find_all(class_='archive-interview')
    for interview in interviews:
        try:
            writer_name = interview.h3.get_text()
            assert(interview.h3.a['href'] == interview.a['href']) # sanity check
            interview_url = proper_url(interview.h3.a['href'])
            photo_url = proper_url(interview.img['src'])
            row = (writer_name, interview_url, photo_url)
        except:
            print('Could not process this interview:', interview.get_text(strip=True))
        else:
            result.append(row)
            print('Processed', writer_name)
    print('Finished processing', index_url)
    return result

def get_interview_listing():
    interviews =[]
    for decade in decades:
        index_url = base_index_url.format(decade)
        interviews.extend(get_decade_listing(index_url))
    return interviews

def save_interviews_csv(interviews):
    with open(interviews_filename, 'w', newline='') as interviews_csv:
        csv_writer = csv.writer(interviews_csv)
        csv_writer.writerow(['writer_name', 'interview_url', 'photo_url'])
        csv_writer.writerows(interviews)

if __name__ == '__main__':
    interviews = get_interview_listing()
    save_interviews_csv(interviews)
