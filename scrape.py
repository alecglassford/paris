import csv
import json
from os import path
from urllib.parse import urlparse

from bs4 import BeautifulSoup
import requests

from settings import *

decades = range(1950, 2020, 10)
hostname = 'http://www.theparisreview.org'
base_index_url = 'http://www.theparisreview.org/interviews/{}s'

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
            author = {}
            author['writer_name'] = interview.h3.get_text()
            assert(interview.h3.a['href'] == interview.a['href']) # sanity check
            author['interview_url'] = proper_url(interview.h3.a['href'])
            author['photo_url'] = proper_url(interview.img['src'])
        except:
            print('Could not process this interview:', interview.get_text(strip=True))
        else:
            result.append(author)
            print('Processed', author['writer_name'])
    print('Finished processing', index_url)
    return result

def get_complete_listing():
    interviews =[]
    for decade in decades:
        index_url = base_index_url.format(decade)
        interviews.extend(get_decade_listing(index_url))
    return interviews

def save_listing(interviews):
    with open(listing_filename, 'w', newline='') as listing_json:
        json.dump(interviews, listing_json, ensure_ascii=False, indent=2)

def save_interview(writer_name, interview_url):
    resp = requests.get(interview_url)
    if not resp.ok:
        print('Failed to get', interview_url)
        return
    dom = BeautifulSoup(resp.text, 'html.parser')
    interview = dom.find(class_='detail-interviews-description')
    paragraphs = [p.get_text() for p in interview.find_all('p')]
    filename = path.join(raw_interview_path, writer_name + '.txt')
    # appending allows writers with multiple interviews to combine into one file
    with open(filename, 'a') as output:
        output.write('\n'.join(paragraphs))
        output.write('\n')
    print('Wrote to', filename)

def save_all_interviews(interviews):
    for interview in interviews:
        save_interview(interview['writer_name'], interview['interview_url'])

if __name__ == '__main__':
    interviews = get_complete_listing()
    save_listing(interviews)
    save_all_interviews(interviews)
