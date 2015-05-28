.PHONY: babel-refresh babel-compile

help:
	@echo 'make babel-refresh           refresh translation strings from code'
	@echo 'make babel-compile           compile translations'

babel-refresh:
	pybabel extract -F babel.cfg -o mapproxy_webconf/locale/messages.pot mapproxy_webconf
	pybabel update -i mapproxy_webconf/locale/messages.pot -d mapproxy_webconf/locale

babel-compile:
	pybabel compile -d mapproxy_webconf/locale
