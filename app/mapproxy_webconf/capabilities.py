from xml.etree import ElementTree as etree
import urlparse
import urllib

from mapproxy.client import http

import logging
log = logging.getLogger(__name__)

class WMS111Capabilities(object):
    def __init__(self, tree):
        self.tree = tree

    def metadata(self):
        name = self.tree.findtext('Service/Name')
        title = self.tree.findtext('Service/Title')
        abstract = self.tree.findtext('Service/Abstract')
        return dict(name=name, title=title, abstract=abstract)

    def root_layer(self):
        layer_elem = self.tree.find('Capability/Layer')
        return self._layers(layer_elem, parent_layer={})

    def service(self):
        metadata = self.metadata()
        url = self.requests()
        root_layer = self.root_layer()
        service = {
            'title': metadata['title'],
            'abstract': metadata['abstract'],
            # todo add more metadata,
            'url': url,
            'layer': root_layer,
        }
        return service

    def requests(self):
        requests_elem = self.tree.find('Capability/Request')
        resource = requests_elem.find('GetMap/DCPType/HTTP/Get/OnlineResource')
        return resource.attrib['{http://www.w3.org/1999/xlink}href']

    def _layers(self, layer_elem, parent_layer):
        this_layer = self._layer(layer_elem, parent_layer)
        sub_layers = layer_elem.findall('Layer')
        if sub_layers:
            this_layer['layers'] = []
            for layer in sub_layers:
                this_layer['layers'].append(self._layers(layer, this_layer))

        return this_layer

    def _layer(self, layer_elem, parent_layer):
        this_layer = dict(
            queryable=bool(layer_elem.attrib.get('queryable', 0)),
            opaque=bool(layer_elem.attrib.get('opaque', 0)),
            title=layer_elem.findtext('Title').strip(),
            name=layer_elem.findtext('Name', '').strip() or None,
            abstract=layer_elem.findtext('Abstract', '').strip() or None,
        )
        llbbox_elem = layer_elem.find('LatLonBoundingBox')
        llbbox = None
        if llbbox_elem is not None:
            llbbox = (
                llbbox_elem.attrib['minx'],
                llbbox_elem.attrib['miny'],
                llbbox_elem.attrib['maxx'],
                llbbox_elem.attrib['maxy']
            )
            llbbox = map(float, llbbox)
        this_layer['llbbox'] = llbbox

        srs_elements = layer_elem.findall('SRS')
        srs_codes = set([srs.text for srs in srs_elements])
        # unique srs-codes in either srs or parent_layer['srs']
        this_layer['srs'] = list(srs_codes | set(parent_layer.get('srs', [])))

        return this_layer

def wms_capabilities_url(url):
    p = urlparse.urlparse(url)
    query = dict((k.upper(), v) for k, v in urlparse.parse_qsl(p.query))
    query['SERVICE'] = 'WMS'
    query['VERSION'] = '1.1.1'
    query['REQUEST'] = 'GetCapabilities'
    query_str = urllib.urlencode(query)

    return urlparse.urlunparse(
        urlparse.ParseResult(p.scheme, p.netloc, p.path, p.params, query_str, p.fragment)
    )

def parse_capabilities(fileobj):
    cap = WMS111Capabilities(etree.parse(fileobj))
    return cap.service()

def parse_capabilities_url(url):
    url = wms_capabilities_url(url)
    log.info('fetching capabilities from: %s', url)

    client = http.HTTPClient()
    try:
        resp = client.open(url)
    except http.HTTPClientError as ex:
        # TODO error handling
        raise ex

    if resp.code == 200:
        return parse_capabilities(resp)


