== Adding a new keyword ==
Every keyword usually follows this format

  ["Phantasmal"] = {
      Code = "$Phantasmal",
      Image = "Icon_Phantasmal.png",
      Text = "Deal Double Damage for the next X turns.",
      Link = "Phantasmal Killer",
    }

=== What the formatting means ===
* <code>$Scry</code> will render {{KW|Scry}} when in an Infobox or Tooltip
* <code>@PO</code> will render {{Icon|PO}} when in an Infobox or Tooltip
* <code>[1|2]</code> means the regular value is 1 but it becomes 2 when the card is upgraded. <br>
* <code>|Innate]</code> means the card gets Innate <i>only</i> when upgraded. <br>
* <code>[Exhaust|</code> means the card exhausts <i>only</i> when not upgraded <br>
* The symbol <code>\n</code> stands for a newline. If you have to add spacing within the card text, example:<br> <blockquote>Innate. <br> Deal 6 Damage. <br> Exhaust.</blockquote> You type <blockquote>Innate. \n Deal 6 Damage. \n Exhaust.</blockquote>

== Linking images ==
# Verify if the image already exists by going to <code>wiki/Special:Search</code>. 
#*Click <code>Advanced Search</code>, find <code>Files and Images</code>, and at <code>File type</code> add png.
#*Use the <code>These words</code> field to add in Time and Warp as keywords. 
# If it does, change the link on this page at <code>Image = <name>.png</code>
# If not, upload them at <code>slaythespire.wiki.gg/wiki/File:[name].png</code>
# Add the link here by going to <code>Image = [image.png]</code> and fixing the name