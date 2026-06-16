import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify
from bs4 import BeautifulSoup
import re
import datetime

app = Flask(__name__)

# Cache for fetched releases to avoid hitting Google's feed on every user reload unless forced
cache = {
    'data': None,
    'last_fetched': None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    req = urllib.request.Request(FEED_URL, headers=headers)
    
    with urllib.request.urlopen(req, timeout=15) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    for entry in root.findall('atom:entry', ns):
        title_el = entry.find('atom:title', ns)
        updated_el = entry.find('atom:updated', ns)
        link_el = entry.find('atom:link', ns)
        content_el = entry.find('atom:content', ns)
        id_el = entry.find('atom:id', ns)
        
        date_str = title_el.text if title_el is not None else ""
        updated_str = updated_el.text if updated_el is not None else ""
        link_href = link_el.attrib.get('href', '') if link_el is not None else ""
        content_html = content_el.text if content_el is not None else ""
        entry_id = id_el.text if id_el is not None else ""
        
        # Parse content HTML
        soup = BeautifulSoup(content_html, 'html.parser')
        
        # Google's BQ release notes feed content is usually structured as:
        # <h3>Feature</h3> (or Changed, Deprecated, etc.)
        # <p>Description...</p>
        # Sometimes there are multiple h3s followed by paragraphs
        
        updates = []
        current_type = None
        current_html = []
        
        # Iterate through elements to group them by h3 headers
        for child in soup.contents:
            # Skip whitespace strings
            if isinstance(child, str) and not child.strip():
                continue
                
            if getattr(child, 'name', None) == 'h3':
                # If we already had an active group, save it before starting a new one
                if current_type:
                    desc_html = "".join(str(c) for c in current_html).strip()
                    desc_text = BeautifulSoup(desc_html, 'html.parser').get_text().strip()
                    updates.append({
                        'type': current_type,
                        'description_html': desc_html,
                        'description_text': desc_text
                    })
                current_type = child.get_text().strip()
                current_html = []
            else:
                if current_type is None:
                    # Content before any H3 - group under "General"
                    current_type = "General"
                current_html.append(child)
                
        # Append the last active group
        if current_type:
            desc_html = "".join(str(c) for c in current_html).strip()
            desc_text = BeautifulSoup(desc_html, 'html.parser').get_text().strip()
            updates.append({
                'type': current_type,
                'description_html': desc_html,
                'description_text': desc_text
            })
            
        # Fallback if no updates were parsed (e.g. format is different)
        if not updates and content_html.strip():
            updates.append({
                'type': 'General',
                'description_html': content_html,
                'description_text': soup.get_text().strip()
            })
            
        entries.append({
            'id': entry_id,
            'date': date_str,
            'updated': updated_str,
            'link': link_href,
            'updates': updates
        })
        
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    global cache
    
    # Check query parameter to force refresh
    import flask
    force_refresh = flask.request.args.get('refresh', 'false').lower() == 'true'
    
    now = datetime.datetime.now()
    if force_refresh or not cache['data'] or (cache['last_fetched'] and (now - cache['last_fetched']).total_seconds() > 3600):
        try:
            entries = fetch_and_parse_feed()
            cache['data'] = entries
            cache['last_fetched'] = now
        except Exception as e:
            # If fetch fails and we have cached data, return cached data with warning, else error
            if cache['data']:
                return jsonify({
                    'status': 'warning',
                    'message': f'Could not refresh feed: {str(e)}. Displaying cached content.',
                    'last_fetched': cache['last_fetched'].isoformat() if cache['last_fetched'] else None,
                    'releases': cache['data']
                })
            return jsonify({
                'status': 'error',
                'message': f'Failed to fetch release notes: {str(e)}'
            }), 500
            
    return jsonify({
        'status': 'success',
        'last_fetched': cache['last_fetched'].isoformat() if cache['last_fetched'] else None,
        'releases': cache['data']
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
