Motivation & Current implementation
------------------------------------

MapProxy is an open source proxy for geospatial data.

There are two configuration files in the YAML Format used by MapProxy.

The main file configures all aspects of the server: Which servers should be started, where comes the data from, what should be cached, etc. The second file is the configuration for the mapproxy-seed tool.

The current implementation of MapProxy GUI is able to create the main configuration and save them in the YAML format into a file. The configuration files are stored in the configured output path. The name of the configuration file is the project name.

Not all MapProxy options are mapped to the GUI. But with the edit manually mode, you are able to add each configuration parameter to your mapproxy config.

The MapProxy documentation is available at: http://mapproxy.org/docs/latest/

Note: In the current implementation the MapProxy GUI don't have a demo client and you are not able to load existing MapProxy configurations.

Installation
------------

We recommend to install MapProxy GUI into a virtual Python environment.

A virtualenv is a self-contained Python installation where you can install arbitrary Python packages without affecting the system installation.

How to create a virutalenv we show you on the MapProxy documentation: http://mapproxy.org/docs/nightly/install.html#create-a-new-virtual-environment

To install from source just do::

	git clone https://github.com/mapproxy/mapproxy-gui.git
	cd mapproxy-gui/app
	pip install -r requirements.txt

Then to start MapProxy GUI do:

	python manage.py runserver

Open http://localhost:8080/ in your browser.


Configuration
-------------

MapProxy GUI has a config.ini file for the configuration.

::

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
