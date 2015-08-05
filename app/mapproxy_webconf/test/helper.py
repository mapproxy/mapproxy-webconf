import errno
import shutil
import tempfile

class TempDirTest(object):
    def setup(self):
        self.tmp_dir = tempfile.mkdtemp()

    def teardown(self):
        try:
            shutil.rmtree(self.tmp_dir)
        except OSError as ex:
            if ex.errno != errno.ENOENT:
                raise

class _ANY(object):
    "A helper object that compares equal to everything."

    def __eq__(self, other):
        return True

    def __ne__(self, other):
        return False

    def __repr__(self):
        return '<ANY>'

ANY = _ANY()