import shutil
import errno
import tempfile

from webtest import TestApp
from mapproxy_webconf.app import init_app
from mapproxy_webconf import bottle

bottle.debug(True)

class TestServerAPI(object):
    def setup(self):
        self.tmp_dir = tempfile.mkdtemp()
        self._app = init_app(self.tmp_dir)
        self.app = TestApp(self._app)

    def teardown(self):
        self._app.uninstall('yamlstore')
        try:
            shutil.rmtree(self.tmp_dir)
        except OSError, ex:
            if ex.errno != errno.ENOENT:
                raise

    def test_wms_list_empty(self):
        resp = self.app.get('/wms')
        assert resp.status == '200 OK'
        assert resp.content_type == 'application/json'
        assert resp.json == {}

    def test_add_wms_source(self):
        doc = {
            'title': 'WMS Source',
            'name': 'wms_source',
            'url': 'http://localhost/service?',
            'layers': [
            ]
        }
        resp = self.app.post_json('/wms', doc)
        assert resp.status == '201 Created'
        resp = self.app.get('/wms')
        assert resp.status == '200 OK'
        assert resp.content_type == 'application/json'
        assert resp.json == {'servers': [doc]}
