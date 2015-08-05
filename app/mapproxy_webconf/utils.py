try:
    from __builtin__ import bytes
except ImportError:
    from builtins import bytes

import os
import errno

from .bottle import response, request
from .decorator import decorator
from mapproxy.compat import text_type, PY2


@decorator
def requires_json(func, *args, **kw):
    try:
        data = request.json
    except ValueError:
        response.status = 400
        return {'error': _('invalid JSON data')}
    if not data:
        response.status = 400
        return {'error': _('missing JSON data')}
    return func(*args, **kw)


def save_atomic(filename, content, makedirs=True):
    """
    Save `content` to `filename` atomicaly. This prevents others from
    reading half-written files.

    :param makedirs: create directories if needed
    """
    if makedirs:
        try:
            os.makedirs(os.path.dirname(filename))
        except OSError as ex:
            if ex.errno != errno.EEXIST:
                raise

    tmp_filename = filename + '~'
    with open(tmp_filename, 'wb') as f:
        if PY2:
            f.write(bytes(content))
        else:
            f.write(bytes(content, 'UTF-8'))
        f.flush()
        os.fsync(f.fileno())

    os.rename(tmp_filename, filename)



# convert the mapproxy conf to validate the content
# we only need this for python 2.x
# source
# http://stackoverflow.com/questions/13101653/python-convert-complex-dictionary-of-strings-from-unicode-to-ascii
def convert(input):
    if isinstance(input, dict):
        return dict((convert(key), convert(value)) for key, value in input.items())
    elif isinstance(input, list):
        return [convert(element) for element in input]
    elif isinstance(input, text_type):
        return input.encode('utf-8')
    else:
        return input
