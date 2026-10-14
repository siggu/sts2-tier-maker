local all_data = {
	-- Ironclad Keywords
	-- Silent Keywords
    ["Sly"] = {
      Code = "$Sly",
      Text = "If this card is discarded from your Hand before the end of the turn, play it for free.",
      Link = "Discard#Sly",
    },
	-- Regent Keywords
	["Stars"] = {
      Code = "$Stars",
      Text = "Stars are an alternative resource needed to play certain cards as the Regent.",
      Link = "Stars",
      Image = "StS2_StarRegent.png",
    },
	["Forge"] = {
      Code = "$Forge",
      Text = "The first time you Forge each combat, add {{C2|Sovereign Blade}} into your Hand. Adds additional damage to {{C2|Sovereign Blade}}.",
      Link = "Sovereign Blade",
    },
	-- Necrobinder Keywords
    ["Summon"] = {
      Code = "$Summon",
      Text = "Summon {{2|Osty}} with X HP. If already summoned, raise his Max HP by X for this combat.",
      Link = "Osty#Summon",
    },
    ["Osty"] = {
      Code = "$Osty",
      Text = "Osty can only attack if he's alive. Osty's attack damage is not affected by Strength or Weak.",
      Link = "Osty",
      Image = "StS2_Osty_Rest.png",
    },
	-- Defect Keywords
	["Channel"] = {
      Code = "$Channel",
      Text = "Channeling an {{2|Orbs|Orb}} puts it into your first empty slot. If you have no empty slots, your first Orb is automatically $Evoked to make room.",
      Link = "Orbs#Channel",
    },
    ["Evoke"] = {
      Code = "$Evoke",
      Text = "Consume your rightmost Orb and use its '''Evoke''' effect.",
      Link = "Orbs#Evoke",
    },
    ["Focus"] = {
      Code = "$Focus",
      Text = "Increases the effectiveness of {{2|Orbs}}.",
      Link = "Orbs#Focus",
      Image = "StS2_Icon_Focus.png",
    },
    ["Lightning"] = {
      Code = "$Lightning",
      Text = "A type of {{2|Orbs|Orb}}. <br> '''Passive''': Deal 3 (+ $Focus) damage to a random enemy. <br>$Evoke: Deals 8 (+ $Focus) damage to a random enemy.",
      Link = "Lightning",
      Image = "StS2_LightningOrb.png",
    },
    ["Frost"] = {
      Code = "$Frost",
      Text = "A type of {{2|Orbs|Orb}}. <br> '''Passive''': Gains 2 (+ $Focus) $Block.<br>$Evoke: Gains 5 (+ $Focus) $Block.",
      Link = "Frost",
      Image = "StS2_FrostOrb.png",
    },
    ["Dark"] = {
      Code = "$Dark",
      Text = "A type of {{2|Orbs|Orb}}. <br> '''Passive''': Increases damage by 6 (+ $Focus) every turn. <br>'''Evoke:''' Deals stored damage to the enemy with the least HP.",
      Link = "Dark",
      Image = "StS2_DarkOrb.png",
    },
    ["Plasma"] = {
      Code = "$Plasma",
      Text = "A type of {{2|Orbs|Orb}}. <br> '''Passive''': Gain 1 @DE '''Energy'''. <br>$Evoke: Gain 2 @DE '''Energy'''.",
      Link = "Plasma",
      Image = "StS2_PlasmaOrb.png",
    },
    ["Glass"] = {
      Code = "$Glass",
      Text = "A type of {{2|Orbs|Orb}}. <br> '''Passive''': Deals 4 (+ $Focus) damage to ALL enemies. Decreases damage every turn. <br>$Evoke: Deal damage equal to double its Passive damage to ALL enemies.",
      Link = "Glass",
      Image = "StS2_GlassOrb.png",
    },
}

local formatted = {}
for name, keyword in pairs(all_data) do
	keyword.EditLink = "Module:Keywords/StS2_data/Player"
	formatted[name] = keyword
end

return formatted