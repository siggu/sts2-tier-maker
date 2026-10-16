local all_data = {
  Icons = {
    ["Red Energy"] = {
      Code = "@RE",
      Text = "The [[Ironclad]]'s Energy orb. Energy is a resource used to play cards.",
      Link = "Keywords#Energy",
      Image = "RedEnergy.png",
    },
    ["Green Energy"] = {
      Code = "@GE",
      Text = "The [[Silent]]'s Energy orb. Energy is a resource used to play cards.",
      Link = "Keywords#Energy",
      Image = "GreenEnergy.png",
    },
    ["Blue Energy"] = {
      Code = "@BE",
      Text = "The [[Defect]]'s Energy orb. Energy is a resource used to play cards.",
      Link = "Keywords#Energy",
      Image = "BlueEnergy.png",
    },
    ["Purple Energy"] = {
      Code = "@PE",
      Text = "The [[Watcher]]'s Energy orb. Energy is a resource used to play cards.",
      Link = "Keywords#Energy",
      Image = "PurpleEnergy.png",
      Size = "20px",
    },
    ["Colorless Energy"] = {
      Code = "@CE",
      Text = "The generic Energy icon found on all Colorless cards. Energy is a resource used to play cards.",
      Link = "Keywords#Energy",
      Image = "ColorlessEnergy.png",
    },
    ["Lightning Orb"] = {
      Code = "@LO",
      Text = "The Defect's Lighting Orb.",
      Link = "Keywords#Orb_Types",
      Image = "LightningOrb.png",
    },
    ["Frost Orb"] = {
      Code = "@FO",
      Text = "The Defect's Frost Orb.",
      Link = "Keywords#Orb_Types",
      Image = "FrostOrb.png",
    },
    ["Dark Orb"] = {
      Code = "@DO",
      Text = "The Defect's Dark Orb.",
      Link = "Keywords#Orb_Types",
      Image = "DarkOrb.png",
    },
    ["Plasma Orb"] = {
      Code = "@PO",
      Text = "The Defect's Plasma Orb.",
      Link = "Keywords#Orb_Types",
      Image = "PlasmaOrb.png",
    },
  },
  Keywords = {
    -- Common Mechanics
    ["Block"] = {
      Code = "$Block",
      Text = "Until next turn, prevents damage.",
      Link = "Block",
      Image = "Icon_Block.png",
    },
    ["Energy"] = {
      Code = "$Energy",
      Text = "Resource used to play cards.",
      Link = "Keywords#Energy",
      Image = "ColorlessEnergy.png",
    },
    ["Ethereal"] = {
      Code = "$Ethereal",
      Text = "If an Ethereal card is in your hand at the end of your turn, it is $Exhausted. <br>$Exhausted cards are removed from your deck until the end of combat.",
      Link = "Keywords#Ethereal",
    },
    ["Exhaust"] = {
      Code = "$Exhaust",
      Text = "Removed until end of combat.",
      Link = "Keywords#Exhaust",
    },
    ["Fatal"] = {
      Code = "$Fatal",
      Text = "Fatal effects occur when a card kills a '''non-minion''' enemy.",
      Link = "Fatal"
    },
    ["Innate"] = {
      Code = "$Innate",
      Text = "Start each combat with this card in your hand.",
      Link = "Keywords#Innate",
    },
    ["Retain"] = {
      Code = "$Retain",
      Text = "Retained cards are not discarded at the end of your turn.",
      Link = "Keywords#Retain",
    },
    ["Transform"] = {
      Code = "$Transform",
      Text = "Transformed cards become a random card of any rarity.",
      Link = "Transform",
    },
    ["Upgrade"] = {
      Code = "$Upgrade",
      Text = "Upgrading cards makes them more powerful. Most cards can only be upgraded once.",
      Link = "Upgrade",
    },
    ["Unplayable"] = {
      Code = "$Unplayable",
      Text = "Unplayable cards cannot be played from your hand.",
      Link = "Keywords#Unplayable",
    },

    -- Defect Mechanics
    ["Orb"] = {
    	Code = "$Orb",
    	Text = "You start with 3 Orb Slots. <br><br>#Lightning: Deal 3(8 on $Evoke) damage to a random enemy. <br>#Frost: Gain 2(5 on $Evoke) $Block. <br>#Dark: Increases damage by 6 every turn. On $Evoke, deal damage to the enemy with the lowest health. <br>#Plasma: Gain 1(2 on $Evoke) $Energy.",
    	Link = "Orbs"
    },
    ["Channel"] = {
      Code = "$Channel",
      Text = "Summons an orb in your first empty $Orb Slot. <br>If you have no empty slots, your first [[Orb]] is automatically $Evoked to make room.",
      Link = "Orbs#Channel",
    },
    ["Orb Slot"] = {
      Code = "$Orb Slot",
      Text = "Orbs can be channeled into these slots. The Defect starts with 3 slots, which can be increased with cards, relics, or potions.",
      Link = "Orbs#Orb_Slots",
      Image = "OrbSlot.png",
    },
    ["Evoke"] = {
      Code = "$Evoke",
      Text = "Consume your rightmost Orb and use its '''Evoke''' effect.",
      Link = "Orbs#Evoke",
    },
    ["Lightning"] = {
      Code = "$Lightning",
      Text = "'''Passive:''' Deal 3 (+1 per $Focus) damage to a random enemy. <br>$Evoke: Deals 8 (+1 per $Focus) damage to a random enemy.",
      Link = "Lightning",
      Image = "LightningOrb.png",
    },
    ["Frost"] = {
      Code = "$Frost",
      Text = "Passive: Gains 2 (+1 per $Focus) $Block.<br>$Evoke: Gains 5 (+1 per $Focus) $Block.",
      Link = "Frost",
      Image = "FrostOrb.png",
    },
    ["Dark"] = {
      Code = "$Dark",
      Text = "'''Passive:''' Increases damage by 6 (+1 per $Focus) every turn. <br>$Evoke: Deals damage to the enemy with the least HP equal to stored damage.",
      Link = "Dark",
      Image = "DarkOrb.png",
    },
    ["Plasma"] = {
      Code = "$Plasma",
      Text = "'''Passive:''' Gain 1 @BE '''Energy'''. <br>$Evoke: Gain 2 @BE '''Energy'''.",
      Link = "Plasma",
      Image = "PlasmaOrb.png",
    },

    -- Watcher Mechanics
    ["Stance"] = {
      Code = "$Stance",
      Text = "You can only have one stance at a time.<br><br>'''Calm:''' Upon exiting this Stance, gain 2 @PE '''Energy'''<br><br>'''Wrath:''' In this Stance, you deal and receive double attack damage.<br><br>'''Divinity:''' Upon entering this Stance, gain 3 @PE '''Energy'''. Attacks deal triple damage. <br>Exit this Stance at the start of your next turn.<br><br>'''Empty:''' No effect.",
      Link = "Keywords#Stance",
    },
    ["Calm"] = {
      Code = "$Calm",
      Text = "Upon exiting this Stance, gain 2 @PE '''Energy'''.",
      Link = "Keywords#Stance",
    },
    ["Wrath"] = {
      Code = "$Wrath",
      Text = "In this Stance, you deal and receive double attack damage.",
      Link = "Keywords#Stance",
    },
    ["Divinity"] = {
      Code = "$Divinity",
      Text = "Upon entering this Stance, gain 3 @PE '''Energy'''. {{QueryLink|Cards|type:Attack|Attacks}} deal triple damage. <br>Exit this $Stance at the start of your next turn.",
      Link = "Keywords#Stance",
    },
    ["Scry"] = {
      Code = "$Scry",
      Text = "Look at the top X cards of your draw pile. You may discard any of them.",
      Link = "Keywords#Scry",
    },

    -- Daily Modifiers
    ["Draft"] = {
    	Code = "$Draft",
    	Text = "'''Daily Modifier''': Draft a starting deck of cards.",
    	Link = "Custom_Mode#Draft",
    	Image = "Mod_Draft.png"
    },
    ["Sealed Deck"] = {
    	Code = "$Sealed Deck",
    	Text = "'''Daily Modifier''': Craft a deck from 30 random cards.",
    	Link = "Custom_Mode#Sealed_Deck",
    	Image = "Mod_SealedDeck.png"
    },
    ["Hoarder"] = {
    	Code = "$Hoarder",
    	Text = "'''Daily Modifier''': Whenever you add a card to your deck, add two additional copies. You can no longer remove cards from your deck at the '''Merchant'''.",
    	Link = "Custom_Mode#Hoarder",
    	Image = "Mod_Greed.png"
    },
    ["Insanity"] = {
    	Code = "$Insanity",
    	Text = "'''Daily Modifier''': Start with a random deck of 50 cards.",
    	Link = "Custom_Mode#Insanity",
    	Image = "Mod_RestlessJourney.png"
    },
    ["Chimera"] = {
    	Code = "$Chimera",
    	Text = "'''Daily Modifier''': Your starting deck is a fusion of all 4 characters.",
    	Link = "Custom_Mode#Chimera",
    	Image = "Mod_Chimera.png"
    },
    ["Shiny"] = {
    	Code = "$Shiny",
    	Text = "'''Daily Modifier''': Your starting deck is replaced with 1 of every rare card.",
    	Link = "Custom_Mode#Shiny",
    	Image = "Mod_Shiny.png"
    },
    ["Specialized"] = {
    	Code = "$Specialized",
    	Text = "'''Daily Modifier''': Start with 5 copies of a single card.",
    	Link = "Custom_Mode#Specialized",
    	Image = "Mod_Specialized.png"
    },
    ["Vintage"] = {
    	Code = "$Vintage",
    	Text = "'''Daily Modifier''': Normal Enemies drop relics instead of cards.",
    	Link = "Custom_Mode#Vintage",
    	Image = "Mod_Vintage.png"
    },
    ["Controlled Chaos"] = {
    	Code = "$Controlled Chaos",
    	Text = "'''Daily Modifier''': Start with '''Frozen Eye'''. At the start of your turn, add 10 random cards to the bottom of your draw pile.",
    	Link = "Custom_Mode#Controlled_Chaos",
    	Image = "Mod_ControlledChaos.png"
    },
    ["All Star"] = {
    	Code = "$All Star",
    	Text = "'''Daily Modifier''': Start with 5 colorless cards.",
    	Link = "Custom_Mode#All_Star",
    	Image = "Mod_AllStar.png"
    },
    ["Diverse"] = {
    	Code = "$Diverse",
    	Text = "'''Daily Modifier''': Cards are not restricted by your character.",
    	Link = "Custom_Mode#Diverse",
    	Image = "Mod_Diverse.png"
    },
    ["Red Cards"] = {
    	Code = "$Red Cards",
    	Text = "'''Daily Modifier''': Red cards now appear in rewards and shops.",
    	Link = "Custom_Mode#Red_Cards",
    	Image = "Mod_RedCards.png"
    },
    ["Green Cards"] = {
    	Code = "$Green Cards",
    	Text = "'''Daily Modifier''': Green cards now appear in rewards and shops.",
    	Link = "Custom_Mode#Green_Cards",
    	Image = "Mod_GreenCards.png"
    },
    ["Blue Cards"] = {
    	Code = "$Blue Cards",
    	Text = "'''Daily Modifier''': Blue cards now appear in rewards and shops.",
    	Link = "Custom_Mode#Blue_Cards",
    	Image = "Mod_BlueCards.png"
    },
    ["Purple Cards"] = {
    	Code = "$Purple Cards",
    	Text = "'''Daily Modifier''': Purple cards now appear in rewards and shops.",
    	Link = "Custom_Mode#Purple_Cards",
    	Image = "Mod_PurpleCards.png"
    },
    ["Colorless Cards"] = {
    	Code = "$Colorless Cards",
    	Text = "'''Daily Modifier''': Colorless cards now appear in rewards and shops.",
    	Link = "Custom_Mode#Colorless_Cards",
    	Image = "Mod_ColorlessCards.png"
    },
    ["Heirloom"] = {
    	Code = "$Heirloom",
    	Text = "'''Daily Modifier''': Start with one 1 Rare relic.",
    	Link = "Custom_Mode#Heirloom",
    	Image = "Mod_Heirloom.png"
    },
    ["Time Dilation"] = {
    	Code = "$Time Dilation",
    	Text = "'''Daily Modifier''': All enemies start with the '''Slow''' debuff.",
    	Link = "Custom_Mode#Time_Dilation",
    	Image = "Mod_TimeDilation.png"
    },
    ["Flight"] = {
    	Code = "$Flight",
    	Text = "'''Daily Modifier''': You may ignore paths when choosing the next room to travel to.",
    	Link = "Custom_Mode#Flight",
    	Image = "Mod_Flight.png"
    },
    ["Deadly Events"] = {
    	Code = "$Deadly Events",
    	Text = "'''Daily Modifier''': Unknown rooms can now contain Elites but are also more likely to contain Treasure Rooms.",
    	Link = "Custom_Mode#Deadly_Events",
    	Image = "Mod_DeadlyEvents.png"
    },
    ["Binary"] = {
    	Code = "$Binary",
    	Text = "'''Daily Modifier''': Card rewards contain only two cards.",
    	Link = "Custom_Mode#Binary",
    	Image = "Mod_Binary.png"
    },
    ["Cursed Run"] = {
    	Code = "$Cursed Run",
    	Text = "'''Daily Modifier''': Whenever you defeat a Boss, become '''Cursed'''. Your starting relic is replaced by '''Cursed Key''', '''Darkstone Periapt''', and '''Du-Vu Doll'''.",
    	Link = "Custom_Mode#Cursed_Run",
    	Image = "Mod_CursedRun.png"
    },
    ["Big Game Hunter"] = {
    	Code = "$Big Game Hunter",
    	Text = "'''Daily Modifier''': Elites are now swarming the Spire and drop better rewards.",
    	Link = "Custom_Mode#Big_Game_Hunter",
    	Image = "Mod_EliteSwarm.png"
    },
    ["Lethality"] = {
    	Code = "$Lethality",
    	Text = "'''Daily Modifier''': You start each combat with +3 '''Strength'''. All enemies start each combat with +3 '''Strength'''.",
    	Link = "Custom_Mode#Lethality",
    	Image = "Mod_LethalEnemies.png"
    },
    ["Midas"] = {
    	Code = "$Midas",
    	Text = "'''Daily Modifier''': Enemies drop 200% more Gold, but you cannot Upgrade cards at Rest Sites.",
    	Link = "Custom_Mode#Midas",
    	Image = "Mod_Midas.png"
    },
    ["Night Terrors"] = {
    	Code = "$Night Terrors",
    	Text = "'''Daily Modifier''': Resting at Rest Sites heals 100% of your HP, but costs 5 max HP.",
    	Link = "Custom_Mode#Night_Terrors",
    	Image = "Mod_NightTerrors.png"
    },
    ["Terminal"] = {
    	Code = "$Terminal",
    	Text = "'''Daily Modifier''': Whenever you enter a new room, lose 1 max HP. Start each combat with 5 '''Plated Armor'''.",
    	Link = "Custom_Mode#Terminal",
    	Image = "Mod_ToughEnemies.png"
    },
    ["Certain Future"] = {
    	Code = "$Certain Future",
    	Text = "'''Daily Modifier''': The map only contains one path.",
    	Link = "Custom_Mode#Certain_Future",
    	Image = "Mod_CertainFuture.png"
    },
    
    -- Custom Modifiers
    ["Endless"] = {
    	Code = "$Endless",
    	Text = "'''Custom Modifier''': Winning will return you to Act 1 with the same deck. But beware, the blight eventually consumes all...",
    	Link = "Custom_Mode#Custom_Modifiers",
    	Image = "Mod_Endless.png"
    },
    ["Daily Mods"] = {
    	Code = "$Daily Mods",
    	Text = "'''Custom Modifier''': Embark on a run with exactly 3 random Daily Mods.",
    	Link = "Custom_Mode#Custom_Modifiers"
    },
    ["The Ending"] = {
    	Code = "$The Ending",
    	Text = "'''Custom Modifier''': Enables the Final Act.",
    	Link = "Custom_Mode#Custom_Modifiers"
    },
    ["Blight Chests"] = {
    	Code = "$Blight Chests",
    	Text = "'''Custom Modifier''': Boss chests contain Blights after beating Act 3 on Endless.",
    	Link = "Custom_Mode#Custom_Modifiers"
    },
    ["Praise Snecko"] = {
    	Code = "$Praise Snecko",
    	Text = "'''Custom Modifier''': Replaces your starting relic with '''Snecko Eye'''.",
    	Link = "Custom_Mode#Custom_Modifiers"
    },
    ["Inception"] = {
    	Code = "$Inception",
    	Text = "'''Custom Modifier''': Replaces your starting relic with '''Unceasing Top'''.",
    	Link = "Custom_Mode#Custom_Modifiers"
    },
    ["My True Form"] = {
    	Code = "$My True Form",
    	Text = "'''Custom Modifier''': Start with a copy of '''Demon Form''', '''Wraith Form''', '''Echo Form''', and '''Deva Form'''.",
    	Link = "Custom_Mode#Custom_Modifiers"
    },
    ["One Hit Wonder"] = {
    	Code = "$One Hit Wonder",
    	Text = "'''Custom Modifier''': Start the game with 1 max HP.",
    	Link = "Custom_Mode#Custom_Modifiers"
    },
    ["Starter Deck"] = {
    	Code = "$Starter Deck",
    	Text = "'''Custom Modifier''': Start with '''Busted Crown''' and Binary, so enemies no longer drop cards.",
    	Link = "Custom_Mode#Custom_Modifiers"
    },
    
    -- Removed Modifiers
    ["Uncertain Future"] = {
    	Code = "$Uncertain Future",
    	Text = "'''Removed Modifier''': The map now only shows Unknown rooms.",
    	Link = "Custom_Mode#Removed_Modifiers",
    	Image = "Mod_UncertainFuture.png"
    },
    ["Brewmaster"] = {
    	Code = "$Brewmaster",
    	Text = "'''Removed Modifier''': Start with '''White Beast Statue''' and 5 copies of '''Alchemize'''.",
    	Link = "Custom_Mode#Removed_Modifiers",
    	Image = "Mod_Brewmaster.png"
    },
    ["Careless"] = {
    	Code = "$Careless",
    	Text = "'''Removed Modifier''': At the beginning of your turn, discard the top card of your draw pile.",
    	Link = "Custom_Mode#Removed_Modifiers",
    	Image = "Mod_TimeDilation.png"
    },
    ["Colossus"] = {
    	Code = "$Colossus",
    	Text = "'''Removed Modifier''': Enemies now have more HP but drop better rewards.",
    	Link = "Custom_Mode#Removed_Modifiers",
    	Image = "Mod_Colossus.png"
    },
    ["Restless Journey"] = {
    	Code = "$Restless Journey",
    	Text = "'''Removed Modifier''': The player no longer heals to full health when entering new Acts.",
    	Link = "Custom_Mode#Removed_Modifiers",
    	Image = "Mod_RestlessJourney.png"
    },
    ["Heartbreaker"] = {
    	Code = "$Heartbreaker",
    	Text = "'''Removed Modifier''': Enables the Final Act. (Renamed to 'The Ending')",
    	Link = "Custom_Mode#Removed_Modifiers"
    }
  }
}

local formatted_icons = {}
for name, icon in pairs(all_data.Icons) do
	icon.EditLink = "Module:Keywords/data"
	formatted_icons[name] = icon
end


local formatted_keywords = {}
for name, keyword in pairs(all_data.Keywords) do
	keyword.EditLink = "Module:Keywords/data"
	formatted_keywords[name] = keyword
end

return {
	Icons = formatted_icons,
	Keywords = formatted_keywords
}