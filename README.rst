Motivation & Current implementation
------------------------------------

MapProxy WebConf is a small web-based configuration tool for MapProxy.

The current implementation of MapProxy WebConf is able to create new configurations and to save them as .yaml files. The configuration files are stored in the configured output path. The name of the configuration file is the project name.

Not all MapProxy options are available from WebConf. But with the `edit manually` mode, you are able to add the missing configuration parameters to your config.

The MapProxy documentation is available at: http://mapproxy.org/docs/latest/

Note: In the current implementation the MapProxy WebConf doesn't have a demo client and you are not able to load existing MapProxy configurations.

Installation
------------

We recommend to install MapProxy WebConf into a virtual Python environment.

A virtualenv is a self-contained Python installation where you can install arbitrary Python packages without affecting the system installation.

How to create a virutalenv is explained in the MapProxy documentation: http://mapproxy.org/docs/nightly/install.html#create-a-new-virtual-environment

To install from source just do::

    git clone https://github.com/mapproxy/mapproxy-webconf.git
    cd mapproxy-webconf/app
    pip install -r requirements.txt

Create your own configuration file from the template::

    cp config.tmpl.ini config.ini

Then start MapProxy WebConf:

    python manage.py runserver

Open http://localhost:8080/ in your browser.


Configuration
-------------

MapProxy WebConf has a config.ini file for the configuration::

    [app]
    # path where the yaml-files are stored
    output_path = /tmp/

    # path where the sqlite-files is stored
    storage_path = ./

    # name of the sqlite.db
    sqlite_db = mapproxy.sqlite

    # default langauge
    language = en

    # supported languages
    supported_languages = en,de

    # demo modus for our online demo
    demo = False
