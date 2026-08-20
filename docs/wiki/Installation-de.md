# Installation

## HACS (empfohlen)

1. **HACS** öffnen → Drei-Punkte-Menü → **Benutzerdefinierte Repositories**.
2. Repository: `https://github.com/Xerolux/heatpump-flow-card`
   Kategorie: **Dashboard** (ältere HACS-Versionen nennen das *Lovelace* oder
   *Plugin*).
3. **Heat Pump Flow Card** suchen und installieren.
4. Browser hart neu laden (<kbd>Strg</kbd>/<kbd>Cmd</kbd> + <kbd>Shift</kbd> +
   <kbd>R</kbd>).

HACS trägt die Dashboard-Ressource selbst ein. Läuft Home Assistant im
YAML-Modus, trägst du sie wie unten beschrieben selbst ein.

## Manuell

1. `heatpump-flow-card.js` aus dem
   [letzten Release](https://github.com/Xerolux/heatpump-flow-card/releases/latest)
   laden oder aus `dist/` kopieren.
2. Nach `config/www/heatpump-flow-card.js` legen.
3. **Einstellungen → Dashboards → Drei-Punkte-Menü → Ressourcen → Ressource
   hinzufügen**
   * URL: `/local/heatpump-flow-card.js`
   * Typ: **JavaScript-Modul**
4. Browser hart neu laden.

Im YAML-Modus stattdessen:

```yaml
lovelace:
  resources:
    - url: /local/heatpump-flow-card.js
      type: module
```

## Karte hinzufügen

**Dashboard bearbeiten → Karte hinzufügen → „Heat Pump Flow Card“ suchen.** Die
Karte bringt einen grafischen Editor mit: erst das Layout, dann die Entitäten je
Abschnitt. Alles, was der Editor kann, geht auch in YAML – siehe
[Konfiguration](Configuration-de).

## Updates

Updates erscheinen in HACS wie bei jedem anderen Repository. Danach den Browser
hart neu laden: Dashboards cachen das JavaScript aggressiv, und ein alter Cache
ist der häufigste Grund dafür, dass eine neue Option „nicht existiert“.

## Voraussetzungen

* Home Assistant 2024.8 oder neuer.
* Sonst nichts – die Datei ist eigenständig, hat keine Abhängigkeiten und lädt
  nichts aus dem Internet nach.
