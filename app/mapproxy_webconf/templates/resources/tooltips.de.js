{
    "uncommonInputs": {
        "content": "Diese Option wird in den meisten Fällen nicht benötigt"
    },
    "filter": {
        "content": "Über den Filter können Sie die Auswahl Ihrer Elemente einschränken."
    },
    "source_available_wms": {
        "content": "<p>Fügen Sie hier vorhanden WMS-Dienste hinzu um diese als Source für den MapProxy verwenden zu können. Nach dem Hinzufügen können Sie die per Drag & Drop zur Sources ziehen.</p> Über die <strong>Weltkugel</strong> haben Sie die Möglichkeit sich den Dienst anzuschauen."
    },
    "sources_name": {
        "content": "Geben Sie hier den Namen der Quelle ein. Dieser dient später zur eindeutigen Identifikation."
    },
    "sources_url":{
        "content": "Über die URL der Quelle wird der Dienst abgefragt. Diese können Sie per Hand eingeben oder per Drag & Drop aus dem rechts verfügbaren WMS hinzufügen."
    },
    "sources_layers": {
        "content": "Definieren Sie hier die Layer die von MapProxy abgerufen werden sollen. Die Layer werden in der unten angegebenen Reihenfolge – von unten nach oben – abgefragt."
    },
    "sources_manual_add_layers": {
        "content": "Fügen Sie Layer manuell hinzu. \n Dies ist zum Beispiel notwendig wenn der Original-WMS kein Capabilites-Dokument ausliefert."
    },
    "sources_supported_formats": {
        "content": "Unterstützt Ihre Sources nur ein bestimmtes Bildformat? Dann können Sie dieses hier einstellen. Falls keine Einstellung vorgenommen wird, wird das Format des Caches verwendet."
    },
    "sources_add_wms": {
        "content": "Fügen Sie hier die URL Ihres Quell-Dienstes ein. Das System fragt das Capabilities-Dokument ab und zeigt Ihnen die vorhandnen Informationen an. Diese können Sie dann per Drag & Drop in die Source ziehen."
    },
    "sources_coverage": {
        "content": "Über die Angabe eines Coverages können Sie die Quelle auf einen bestimmten Bereich begrenzen. Erstellen Sie eine Bounding Box oder Zeichnen Sie ein Polygon in der Karte."
    },
    "sources_supported_srs": {
        "content": "Unterstüzt die Quelle nicht die angefragte Koordinatensystem können Sie hier gezielt einstellen welches Koordinatensystem angefragt werden soll. In vielen Fällen ist dies aber nicht nötig. Ist kein Koordinatensystem ausgewählt wird das im  Cache definerte verwendet."
    },
    "min_max_res": {
        "content": "Stellen Sie ein von ab und bis zu welchem Maßstab oder Auflösung die Einstellungen gelten. Sie können bei der eingabe zwischen Maßstab und Auflösung, sowie zwischen Grad und Meter auswählen."
    },
    "max_scale": {
        "content": "Kleinster Maßstab z.B. 1:500.000"
    },
    "min_scale": {
        "content": "Größter Maßstab z.B. 1:100"
    },
    "max_res": {
        "content": "Größte Auflösung für die Daten"
    },
    "min_res": {
        "content": "Kleinste Auflösung für die Daten"
    },
    "sources_add_srs_manual": {
        "content": "Fügen Sie hier die SRS manuell hinzu. Bitte geben Sie hier den EPSG-Code an. Zum Beispiel: EPSG:31467"
    },
    "grids_list": {
        "content": "Hier finden Sie eine Übersicht über die von Ihnen definierten und standardmässig bereitgestellten Grids."
    },
    "grids_default_list": {
        "content": "<p>MapProxy stellt Ihnen einige DefaultGrids zur Verfügung. Diese können Sie direkt in den Caches verwenden.</p> Die Default-Grids können nicht bearbeitet werden. Wenn Sie Einstellungen ändern möchten können Sie die Grids kopieren und entsprechend anpassen."
    },
    "grid_name": {
        "content": "Definieren Sie hier einen eindeutigen Namen des Grids."
    },
    "grid_srs": {
        "content": "Wählen Sie hier das Koordinatensystem des Grids aus. Ist das benötigte Koordinatensystem nicht in der Liste vorhanden können Sie dieses in den Projekteinstellungen hinzufügen."
    },
    "grid_bbox": {
        "content": "Geben Sie die Bounding Box an in welchem Bereich das Grid gültig sein soll"
    },
    "grid_bbox_srs": {
        "content": "Die Bounding Box können Sie in dem gewünschten SRS angeben."
    },
    "grid_calculate_tiles": {
        "content": "Berechnen Sie sich die Anzahl der Kacheln die das Grid verwendet. Die Level & Daten werden Ihnen in der rechten Spalte angzeigt."
    },
    "grid_origin": {
        "content": "<p>Standardmässig ist der Kachelnullpunkt des Gitters unten links ausgerichtet. Für den WMTS Standard trannsformiert MapProxy diese nach oben links. Für benutzerdefinierte Grds können die Einstellungen zudem noch angepasst werden.</p> SW / LL definiert den Kachelnullpunkt unten links. NW / UL oben links vom Gitter."
    },
    "grid_scale": {
        "content": "Geben Sie hier die Resolutions/Maßstäbe an, an denen MapProxy cachen soll."
    },
    "cache_name": {
        "content": "Geben Sie den Namen des Caches ein. Dieser dient später zur eindeutigen Identifikation. Bitte beachten Sie das ein Cache nicht den selben Namen tragen kann wie eine Source."
    },
    "cache_sources": {
        "content": "Fügen Sie per Drag&Drop die Sources oder Caches zu die verwendet werden sollen."
    },
    "cache_grids": {
        "content": "Definieren Sie die Grids die verwendet werden sollen. Sie können diese per Drag & Drop von rechts in das Feld ziehen."
    },
    "cache_format": {
        "content": "Wählen Sie das Bildformat des Caches sowie das vom MapProxy angefragte Bildformat aus."
    },
    "cache_image_format": {
        "content": "Über den Parameter 'Format' können sie das Bildformat für die Daten im Cache einstellen. Standardmässig verwendet MapProxy PNG."
    },
    "cache_request_format": {
        "content": "Definieren Sie hier in welchem Bildformat die Daten für den Cache angefragt werden soll. Standardmässig wird das unter Format des Caches verwendet. Häufig muss diese Option daher nicht genutzt werden. "
    },
    "cache_sources_list": {
        "content": "Ziehen Sie die gewünschte Sources per Drag & Drop in den Bereich <em>Sources</em> im ausgewählten Cache."
    },
    "cache_caches_list": {
        "content": "Auch Caches können als Quelle für Caches verwendet werden. Ziehen Sie den gewünschten Cache in den Bereich Sources"
    },
    "cache_grids_list": {
        "content": "Wählen Sie das passende Grid für Ihren Cache aus. Falls Grids im Nachhinein verändert werden muss der Cache unter umständen geändert werden. Nutzen Sie daher, wenn möglich, nur fertige Grids."
    },
    "layer_name": {
        "content": "Geben Sie hier den Namen des Layers ein. Dieser dient später zur eindeutigen Identifikation."
    },
    "layer_title": {
        "content": "Der Titel des Layers wird im Capabilities-Dokument angezeigt und dient in GI-Systemen zur Identifikation. Wählen Sie hier daher eine möglichst sprechnede Beschreibung."
    },
    "layer_sources": {
        "content": "Als Quellen für den Layer können Sie Caches oder Sources verwenden. Die Quellen werden von unten nach oben von MapProxy abgefragt."
    },
    "layer_caches_list": {
        "content": "Ziehen Sie den gewünschten Cache in den Bereich Sources zum Layer."
    },
    "layer_sources_list": {
        "content": "Sie können auch ungecachtee Dienste in einem Layer verwenden. Ziehen Sie den gewünschten Dienst per Drag & Drop in den Bereich <em>Sources</em>."
    },
    "services_demo": {
        "content": "<p>Der MapProxy-Demodienst ermöglicht es Ihnen die MapProxy Konfiguration zu testen. Hier finden Sie die Möglichkeit den Dienst in unterschiedlichen Koordinatensystem und Formen abzurufen. </p>Für den Produktivbetrieb empfehlen wir den Dienst zu deaktivieren."
    },
    "services_kml": {
        "content": "Nach dem Aktivieren der KML Option können Sie den Dienst über die KML-Schnittstelle abrufen. Der Dienst kann dann zum Beispiel in Google Earth eingebunden werden."
    },
    "services_tms": {
        "content": "Der Tile Map Serivce (TMS) ist ein OSGeo-Standard der die Karten in Kachelform bereitstellt. Der Dienst eignet sich besonders für Webanwendungen."
    },
    "services_wms": {
        "content": "Über den Web Map Serivice (WMS) können Sie die Dienste zum Beispiel in Desktop-GI-Systeme einbinden."
    },
    "services_wmts": {
        "content": "Der WMTS-Standard ist der OGC Kachelstandard. Er wird von einigen Desktop- und Web-Systemen unterstützt."
    },
    "service_wms_title": {
        "content": "Der WMTS-Standard ist der OGC Kachelstandard. Er wird von einigen Desktop- und Web-Systemen unterstützt."
    },
    "service_wms_srs": {
        "content": "Der WMTS-Standard ist der OGC Kachelstandard. Er wird von einigen Desktop- und Web-Systemen unterstützt."
    },
    "service_wms_metadata": {
        "content": "<p>Die Metadaten des WMS Dienstes werden im Capabilities-Dokument angegeben. Diese Informationen dienen dem Nutzer als zusätzliche Informaitonsquelle.</p> Die Daten sind optional und können auch freigelassen werden."
    },
    "service_wms_md_abstract": {
        "content": "Beschreiben Sie hier kurz den Inhalt des Dienstes."
    },
    "service_wms_md_online_resource": {
        "content": "Geben Sie hier die Online-Resource an unter dem der Dienst erreichbar ist."
    },
    "service_wms_md_contact": {
        "content": "<p>Bei Fragen zum Dienst soll durch die Kontaktdaten die Möglichkeit geschaffen werden einen Ansprechpartner zu finden. Tragen Sie daher hier die Kontaktdaten ein.</p> Die Daten müssen nicht vollständig angegeben werden. Leere Felder werden von MapProxy einfach ignoriert."
    },
    "service_wms_md_access_constraints": {
        "content": "Über die Zugriffsbeschränkungen können Sie die Lizenz der Karten angeben. Also ob diese zum Beispiel nur für den privaten Gebrauch genutzt werden können."
    },
    "globals_list": {
        "content": "In diesem Bereich können die internen Einstellungen konfiguriert werden, die in allen Beriech von MapProxy verwendet werden."
    },
    "globals_cache": {
        "content": "Definieren Sie hier die globalen Cache Optionen von MapProxy."
    },
    "globals_cache_meta_size": {
        "content": "<p>MapProxy fragt mehrere Kacheln in einer Anfrage ab. Über die Metasize können Sie angeben wie viele Kacheln in einer Anfrage abgefragt werden sollen. Standardmässig wird eine Metasize von 4x4 verwendet.</p> Bei einer Metasize mit den Werten 4 x 4 fragt MapProxy 16 Kacheln in einer Anfrage ab. Bei einer Kachelgröße von 256x256 Pixeln wird also eine Anfrage von 1024x1024 Pixeln an den WMS gesendet."
    },
    "globals_cache_meta_buffer": {
        "content": "<p>Um das Problem mit abgeschnittenen Beschriftungen an Kachelgrenzen zu verbessern verfügt MapProxy über einen so genannten Metabuffer.</p> MapProxy vergrößert mit dem Metabuffer die Meta-Anfrage in jede Richtung um die angegebene Pixelanzahl. Standardmässig wird ein Metabuffer von 200 Pixeln verwendet."
    },
    "globals_image": {
        "content": "Legen Sie hier die Optionen für die von MapProxy generierten Bilder fest."
    },
    "globals_image_resampling_method": {
        "content": "<p>Die Resampling Methode wird verwendet wenn Bilder transformiert oder skaliert werden.</p> Die Option <em>Nearest</e> ist die schnellste und <em>Bicubic</em> die langsamste. Optisch bekommen Sie das beste Resultat wenn Sie <em>Bilinear</em> oder <em>Bicubic</em> auswählen. Die Option <em>Bicubic</em> erhöht den Kontrast und sollte daher für Vektordaten genutzt werden."
    },
    "globals_image_paletted": {
        "content": "Über diese Option können Sie zwischen 8bit und 24bit PNG Bilder wählen. Standardmässig sind 8bit PNG Bilder aktiviert. Deaktivieren Sie paletted wenn Sie 24bit PNG Bilder benötigen."
    },
    "default_config_dpi": {
        "content": "<p>Der DPI Wert wird für die Berechnung verwendet. Hier sollte der selbe Wert eingestellt werden der auch vom Client oder dem Server genutzt wird. Häufige Werte sind 72 oder 96dpi. </p>Standardmässig werden 91dpi – der Wert des OGC WMS in der Version 1.3.0 – verwendet."
    },
     "default_config_srs": {
        "content": "Die hier angegebenen Koordinatensysteme stehen in den Auswahllisten in der Anwendung zur Verfügung."
    },
     "default_config_add_srs": {
        "content": "Fügen Sie hier Koordinatensysteme für die Auswahl hinzu. Das Format muss wie folgt angegeben sein: EPSG:xxxx"
    }

}

