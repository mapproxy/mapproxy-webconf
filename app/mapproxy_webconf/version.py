from __future__ import print_function
import pkg_resources

def version_string():
    """
    Return the current version number of MapProxy WebConf.
    """
    try:
        return pkg_resources.working_set.by_key['mapproxy-webconf'].version
    except KeyError:
        return 'unknown_version'

__version__ = version = version_string()

if __name__ == '__main__':
    print(__version__)