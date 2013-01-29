import errno
import shutil
import tempfile

class TempDirTest(object):
    def setup(self):
        self.tmp_dir = tempfile.mkdtemp()

    def teardown(self):
        try:
            shutil.rmtree(self.tmp_dir)
        except OSError, ex:
            if ex.errno != errno.ENOENT:
                raise