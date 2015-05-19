from setuptools import setup, find_packages

install_requires = [
  'PyYAML>=3.0,<3.99',
  'MapProxy<=1.8.0',
]

setup(
    name='MapProxy WebConf',
    version="0.9",
    description='Small web-based configuration tool for MapProxy',
    author='Dominik Helle',
    author_email='info@omniscale.de',
    url='http://mapproxy.org',
    license='Apache Software License 2.0',
    namespace_packages = ['mapproxy_webconf'],
    packages=find_packages(),
    include_package_data=True,
    package_data = {'': ['*.xml', '*.yaml', '*.ini']},
    install_requires=install_requires,
    entry_points = {
        'console_scripts': [
            'mapproxy-webconf = mapproxy_webconf.script.util:main',
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 2.7",
        "Topic :: Scientific/Engineering :: GIS",
        "Topic :: Software Development :: Build Tools",
    ],
    zip_safe=False,
    test_suite='nose.collector',
)