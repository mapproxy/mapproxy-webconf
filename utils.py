import os
import errno

def save_atomic(filename, content, makedirs=True):
    """
    Save `content` to `filename` atomicaly. This prevents others from
    reading half-written files.

    :param makedirs: create directories if needed
    """
    if makedirs:
        try:
            os.makedirs(os.path.dirname(filename))
        except OSError, ex:
            if ex.errno != errno.EEXIST:
                raise


    tmp_filename = filename + '~'
    with open(tmp_filename, 'wb') as f:
        f.write(content)
        f.flush()
        os.fsync(f.fileno())

    os.rename(tmp_filename, filename)
