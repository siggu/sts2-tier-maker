== Overview== 

This module defines all potion data used in the game.
Each entry describes a potion’s effect, rarity, image, and optional character restriction.

== Structure == 
<syntaxhighlight>
["Potion Name"] = {
  Text = "Effect text",
  Image = "Icon filename",
  Rarity = "Common | Uncommon | Rare",
  Character = "Optional",
  Code = "#Potion Identifier"
}
</syntaxhighlight>

== Notes ==
* <X:Y> values indicate descriptions changing when the player has {{R|Sacred Bark}}.
* Character is only present for class-specific potions.
* Used for rendering potion details in UI, wikis, or tooltips.