import os
import gettext

from .bottle import request, response, SimpleTemplate


class TranslationPlugin(object):
    name = 'translation'

    def __init__(self, configuration):
        try:
            self.translations = {
                'de': gettext.translation('messages', os.path.join(os.path.dirname(os.path.realpath(__file__)), 'locale'), ['de']),
                'en': gettext.translation('messages', os.path.join(os.path.dirname(os.path.realpath(__file__)), 'locale'), ['en']),
            }
        except IOError as e:
            print(e)

        # read langauge from config file to get supported_langauges
        self.supported_languages = configuration.get('app', 'supported_languages')
        self.supported_languages = self.supported_languages.split(',')
        default_language = configuration.get('app', 'language')
        SimpleTemplate.defaults["supported_languages"] = self.supported_languages
        self.install_language(
            default_language if default_language in self.supported_languages else self.supported_languages[0])

    def apply(self, callback, context):
        def wrapper(*args, **kwargs):
            language = False

            query_language = request.query.get('language', False)
            if query_language not in self.supported_languages:
                query_language = False

            cookie_language = request.get_cookie('mp-gui_language', False)
            if cookie_language not in self.supported_languages:
                cookie_language = False

            if query_language and query_language != cookie_language:
                response.set_cookie('mp-gui_language', query_language, path='/')
                language = query_language
            elif cookie_language:
                language = cookie_language

            if language and language != self.language:
                self.install_language(language)

            return callback(*args, **kwargs)
        return wrapper

    def install_language(self, language):
        self.language = language
        self.translations[self.language].install()
        SimpleTemplate.defaults["language"] = self.language
        SimpleTemplate.defaults["_"] = _
