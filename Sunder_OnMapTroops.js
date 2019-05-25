/*
==============================================================================
On Map Troops
Written by Sunderww (Lucas BERGOGNON)
Started On: 25/05/2019

Allows you to place encounters on the map (with events) and to have
information displayed on the map

==============================================================================
Terms of Use: MIT License
==============================================================================

Copyright (c) 2019 Lucas BERGOGNON

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

==============================================================================
*/


var Sunder = Sunder || {};
Sunder.OMT = Sunder.OMT || {};
Sunder.OMT.version = '0.2';

var Imported = Imported || {};
Imported.Sunder_OnMapTroops = Sunder.OMT.version;


/*:
 * @plugindesc Allows you to put encounters on map and have information on
 * which troop it is (popup above the event)
 * @author Sunderww
 * @version 0.2
 *
 * @param alwaysDisplayed
 * @text Always display popup
 * @desc If false, popup will only be displayed on mouse over. [NOT WORKING YET]
 * @type Boolean
 * @default false
 *
 * @param showEnemies
 * @text Show enemies
 * @desc Display a list of enemies in the popup
 * @type Boolean
 * @default true
 *
 * @param showExp
 * @text Show EXP
 * @desc Display how many experience will be won in the popup
 * @type Boolean
 * @default true
 *
 * @param showGold
 * @text Show gold
 * @desc Display how many gold will be won in the popup
 * @type Boolean
 * @default true
 *
 * @help
 * ===========================================================================
 * Description
 * ===========================================================================
 *
 * There is no need for a plugin to have on-map encounters. You just have to
 * setup an event, give it an enemy character with a "player touch" or "event
 * touch" trigger, and set an autonomous movement depending on what you want.
 *
 * But it's not always ideal to see ONE character and have no idea about the
 * troop you're about to fight.
 * This plugin aims to solve this problem by displaying a popup above the
 * encounter event with all the troop enemies, their level if available,
 * and the total xp/gold that will be won after battle.
 *
 * ===========================================================================
 * How to use this plugin
 * ===========================================================================
 *
 * Use the notetag <OnMapTroop: [id]> on an event, where [id] is to be replaced
 * by the troop id.
 *
 * ===========================================================================
 * Changelog
 * ===========================================================================
 *
 * version 0.2:
 *  - fixed a bug with the parameters that were not working.
 *
 * version 0.1:
 *  - Always show the window with the basic information. Not much customisation
 * is given, but it works.
 *  - BUG: The window can be hidden if the enemy character goes near the edge
 * of the screen. Will be fixed later
 */

(function() {

  let _params = PluginManager.parameters('Sunder_OnMapTroops') || {};
  Sunder.OMT.options = {
    alwaysDisplayed: _params.alwaysDisplayed === "true",
    show: {
      enemies: _params.showEnemies === "true",
      exp: _params.showExp === "true",
      gold: _params.showGold === "true"
    }
  };

  //==========================================================================
  // Window_TroopInfo
  //==========================================================================

  function Window_TroopInfo() {
      this.initialize.apply(this, arguments);
  }

  Window_TroopInfo.prototype = Object.create(Window_Base.prototype);
  Window_TroopInfo.prototype.constructor = Window_TroopInfo;

  Window_TroopInfo.prototype.initialize = function() {
    Window_Base.prototype.initialize.call(this, 0, 0, 100, 100);
    this.setCharacter(null);
    this._enemies = [];
  };

  Window_TroopInfo.prototype.setCharacter = function(character) {
    this.visible = false;
    this._character = character;

    if (this._character && this._character._eventId) {
      let event = $dataMap.events[this._character._eventId];
      this.setTroopInfo(event);
    }
  };

  // Set the _enemies member given a troop ID
  Window_TroopInfo.prototype.setEnemies = function(troopId) {
    this._enemies = [];
    $dataTroops[troopId].members.forEach(function(troopMember) {
      this._enemies.push($dataEnemies[troopMember.enemyId]);
    }, this);
  };

  Window_TroopInfo.prototype.setTroopInfo = function(event) {
    // "Parse" notetag and then set correct information
    if (event.meta.OnMapTroop) {
      let info = event.meta.OnMapTroop.split(',');
      if (info.length > 0) {
        let troopId = info[0].trim();
        this.visible = true;
        this.setEnemies(troopId);
        this.constructText();
      }
    }
  }

  // Constructs the text to be displayed using the _enemies array
  Window_TroopInfo.prototype.constructText = function() {
    let text = "";
    let totalExp = 0;
    let totalGold = 0;

    console.log(Sunder.OMT.options);
    console.log(_params);

    this._enemies.forEach(function(enemy) {
      if (Sunder.OMT.options.show.enemies) {
        text += (text.length ? "\n" : "");
        text += enemy.battlerName;
        if (Sunder.OMT.options.show.exp) text += " ("+enemy.exp+")";
      }
      totalExp += enemy.exp;
      totalGold += enemy.gold;
    }, this);

    if (Sunder.OMT.options.show.exp || Sunder.OMT.options.show.gold)
      text += (text.length ? "\n" : "");

    if (Sunder.OMT.options.show.exp && Sunder.OMT.options.show.gold)
      text += totalExp + " exp / " + totalGold + $dataSystem.currencyUnit;
    else if (Sunder.OMT.options.show.exp)
      text += totalExp + " exp"
    else if (Sunder.OMT.options.show.gold)
      text += totalGold + $dataSystem.currencyUnit

    this.setText(text);
  };

  Window_TroopInfo.prototype.setText = function(text) {
    if (this._text !== text) {
        this._text = text;
        this.refresh();
    }
  };

  // Clear the content and redraw again
  Window_TroopInfo.prototype.refresh = function() {
    this.contents.clear();

    let widths = [];
    let textLines = this._text.split("\n");
    textLines.forEach(function(line) {
      widths.push(this.drawTextEx(line, 0, this.contents.height) + this.textPadding() * 2);
    }, this);

    let width = Math.max(...widths);
    this.width = width + this.standardPadding() * 2;
    this.height = this.fittingHeight(textLines.length);
    this.createContents();
    var wx = (this.contents.width - width) / 2;
    var wy = 0;
    this.drawTextEx(this._text, wx + this.textPadding(), wy);
  };


  //=============================================================================
  // Sprite_Character
  //=============================================================================

  _old_Sprite_Character_update = Sprite_Character.prototype.update;
  Sprite_Character.prototype.update = function() {
    _old_Sprite_Character_update.call(this);
    this.updateTroopWindow();
  };

  // Creates the troop window if needed, then position it correctly
  Sprite_Character.prototype.updateTroopWindow = function() {
    this.createTroopWindowIfNeeded();
    if (!this._troopWindow) return;
    this.positionTroopWindow();
  };

  // Creates the troop window if needed
  Sprite_Character.prototype.createTroopWindowIfNeeded = function() {
    if (this._troopWindow) return;
    if (!SceneManager._scene._spriteset) return;

    this._troopWindow = new Window_TroopInfo();
    this._troopWindow.setCharacter(this._character);
    //this.parent.parent.addChild(this._miniLabel);
    SceneManager._scene._spriteset.addChild(this._troopWindow);
  };

  // Position the troop window above the sprite
  Sprite_Character.prototype.positionTroopWindow = function() {
    let win = this._troopWindow;
    win.x = this.x - win.width / 2;
    win.y = this.y - this.height - win.height;
  };

  // Refresh the troop window
  Sprite_Character.prototype.refreshTroopWindow = function() {
      if (this._troopWindow) this._troopWindow.refresh();
  };

})();
