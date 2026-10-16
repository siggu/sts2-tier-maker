== Formatting ==
This module returns a table where each card is referenced by name, with each having a number of fields describing them.

<syntaxhighlight lang="lua">
["Bash"] = {
  -- Use -1 for X-cost and -2 for Unplayable cards.
  Cost = 2, 
  -- CostPlus - Use only for cards that reduce their cost when Upgraded.
  -- Each color corresponds to a character. Red => Ironclad, Green => Silent, Blue => Defect, Purple => Watcher. Cards for all characters are Colorless.
  Color = "Red",
  -- The name of the un-upgraded full card image.
  Image = "Red-Bash.png",
  -- Can be any of the following: Attack, Skill, Power, Status, Curse
  Type = "Attack",
  -- Can be any of the following: Basic, Common, Uncommon, Rare, Special, Curse
  Rarity = "Basic",
  -- The card's effects, using <br> for line breaks. Words starting with $ are keywords.
  Text = "Deal [8|10] damage.<br>Apply [2|3] $Vulnerable"
  -- NoUpgrade - Add if the card cannot be upgraded, usually for Curses or Statuses.
}
</syntaxhighlight>
=== Notes ===
* Image - The naming scheme is as follows: <code>Color-CardName.png</code> This is then manipulated to get other images such as upgraded cards and art.
* Text - Keywords are formatted and converted to full inline links by [[Template:Infobox Styling]]. See [[#What the formatting means]] for more info on how upgrades are formatted.

== Fixing text==
If there are errors in any of the card information, here is how you fix it.

# Find the card you want to change. (Ctrl+f)<br>
# Find the value you want to change. <br>
# Change the value and save. <br>

For example, if you wanted to change the cost of Apotheosis to 3:

# Find the data for Apotheosis (CTRL+F 'Apotheosis') <br>
# Find the line for <code>Cost = [number]</code> <br>
# Change the line to <code>Cost = 3</code> <br>

=== What the formatting means ===
* <code>[1|2]</code> means the regular value is 1 but it becomes 2 when the card is upgraded. <br>
* <code>[|Innate]</code> means the card gets Innate <i>only</i> when upgraded. <br>
* <code>[Exhaust|]</code> means the card loses Exhaust <i>only</i> when upgraded <br>

== Fixing images ==
You can't edit images directly on this page, this page only links card information to image files. If there's a mistake or a broken link/missing image:

# Verify if the image already exists by typing for example <code>slaythespire.wiki.gg/wiki/File:Red-BurningBlood.png</code>
#*Check if it exists by going to <code>wiki/Special:Search</code>. 
#*Click <code>Advanced Search</code>, find <code>Files and Images</code>, and at <code>File type</code> add png.
#*Use the <code>These words</code> field to add in Burning and Blood as keywords. 
# If it does, change the link on this page at <code>Image = <name>.png</code>
# If not, upload them at <code>slaythespire.wiki.gg/wiki/File:[name].png</code>
# Add the link here by going to <code>Image = [image.png]</code> and fixing the name