import os

from ..capabilities import parse_capabilities, wms_capabilities_url
from mapproxy.test.http import assert_query_eq

def test_wms_capabilities_url():
    assert_query_eq(wms_capabilities_url('http://foo/'),
        'http://foo/?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1')

    assert_query_eq(wms_capabilities_url('http://foo/service'),
        'http://foo/service?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1')

    assert_query_eq(wms_capabilities_url('http://foo/service?'),
        'http://foo/service?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1')

    assert_query_eq(wms_capabilities_url('http://foo:8080/bar/service?'),
        'http://foo:8080/bar/service?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1')

    assert_query_eq(wms_capabilities_url('http://foo:8080/bar/service?REQUEST=getcapabilities'),
        'http://foo:8080/bar/service?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1')

    assert_query_eq(wms_capabilities_url('http://foo:8080/bar/service?Version=1.3.0'),
        'http://foo:8080/bar/service?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1')

    assert_query_eq(wms_capabilities_url('http://foo:8080/bar/service?key=value'),
        'http://foo:8080/bar/service?REQUEST=GetCapabilities&SERVICE=WMS&VERSION=1.1.1&key=value')


def test_parsing_111():
    f = open(os.path.join(os.path.dirname(__file__), 'fixtures', 'wms_nasa_cap.xml'))
    cap = parse_capabilities(f)
    assert cap['title'] == 'JPL Global Imagery Service'
    assert cap['url'] == 'http://wms.jpl.nasa.gov/wms.cgi?'
    root_layer = cap['layer']

    assert root_layer['title'] == 'OnEarth Web Map Server'
    assert len(root_layer['layers']) == 15

    for layer in root_layer['layers']:
        assert 'title' in layer

    layer = root_layer['layers'][0]

    assert layer['title'] == 'WMS Global Mosaic, pan sharpened'
    assert layer['name'] == 'global_mosaic'
    assert layer['llbbox'] == [-180.0, -60.0, 180.0, 84.0]
    assert layer['queryable'] == True
    assert layer['opaque'] == False
    assert layer['abstract'].startswith('Release 2 of the WMS Global Mosaic')
    assert sorted(layer['srs']) == sorted(['EPSG:4326', 'AUTO:42003'])

