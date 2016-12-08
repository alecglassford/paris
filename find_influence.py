import json
import re

from settings import *

base_pattern = r'^.*\b{}\b.*$'

with open(listing_filename, 'r') as listing_json:
    writers = json.load(listing_json)

# compile regexes
for writer in writers:
    writer['pattern'] = re.compile(base_pattern.format(writer['writer_name']), re.MULTILINE)

def influences_of(current_name):
    result = {}
    raw_filename = path.join(raw_interview_path, current_name + '.txt')
    with open(raw_filename, 'r') as raw_file:
        interview_text = raw_file.read()
    for other_writer in writers:
        other_name = other_writer['writer_name']
        if other_name == current_name:
            continue
        paragraphs = other_writer['pattern'].findall(interview_text)
        if paragraphs:
            paragraphs = add_speaker(paragraphs, interview_text)
            result[other_name] = paragraphs
    print('Found that', current_name, 'was influenced by', result.keys())
    return result

def add_speaker(paragraphs, interview_text):
    with_speaker = []
    split_text = interview_text.split('\n')
    for paragraph in paragraphs:
        index = split_text.index(paragraph)
        first = True
        while True:
            if index == 0: # At the start, therefore: INTERVIWER
                with_speaker.append('INTERVIEWER: ' + paragraph)
                break
            if split_text[index].isupper(): # e.g. 'INTERVIEWER'
                with_speaker.append(split_text[index] + ': ' + paragraph)
                break
            if first:
                paragraph = ' ... ' + paragraph # only if more than 1 back
                first = False
            index -= 1
    return with_speaker

def save_influences():
    for writer in writers:
        current_name = writer['writer_name']
        influences = influences_of(current_name)
        filename = path.join(influence_path, current_name + '.json')
        with open(filename, 'w') as output:
            json.dump(influences, output, ensure_ascii=False, indent=2)
        print('Wrote to', filename)

if __name__ == '__main__':
    save_influences()
