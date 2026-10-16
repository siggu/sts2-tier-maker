local all_data = {
		["Draft"] = {
      Code = "$Draft",
      Text = "Choose 10 card rewards to replace your starting deck.",
      Link = "Custom_Mode#Draft",
      Image = "StS2_Mod_Draft.png",
    },
        ["Sealed Deck"] = {
      Code = "$SealedDeck",
      Text = "Choose 10 out of 30 cards to replace your starting deck.",
      Link = "Custom_Mode#SealedDeck",
      Image = "StS2_Mod_SealedDeck.png",
    },
        ["Hoarder"] = {
      Code = "$Hoarder",
      Text = "Whenever you add a card to your deck, add 2 additional copies. You can no longer remove cards from your deck at the Merchant.",
      Link = "Custom_Mode#Hoarder",
      Image = "StS2_Mod_Hoarder.png",
    },
        ["Specialized"] = {
      Code = "$Specialized",
      Text = "Start with 5 copies of a single card.",
      Link = "Custom_Mode#Specialized",
      Image = "StS2_Mod_Specialized.png",
    },
        ["Insanity"] = {
      Code = "$Insanity",
      Text = "Start with a random deck of 30 cards.",
      Link = "Custom_Mode#Insanity",
      Image = "StS2_Mod_Insanity.png",
    },
        ["All Star"] = {
      Code = "$AllStar",
      Text = "Start with 5 Colorless cards.",
      Link = "Custom_Mode#AllStar",
      Image = "StS2_Mod_AllStar.png",
    },
        ["Flight"] = {
      Code = "$Flight",
      Text = "You may ignore paths when choosing the next room to travel to.",
      Link = "Custom_Mode#Flight",
      Image = "StS2_Mod_Flight.png",
    },
        ["Vintage"] = {
      Code = "$Vintage",
      Text = "Normal enemies drop Relics instead of cards.",
      Link = "Custom_Mode#Vintage",       
      Image = "StS2_Mod_Vintage.png",
    },
        ["Ironclad Cards"] = {
      Code = "$IroncladCards",
      Text = "Ironclad cards will now appear in rewards and shops.",
      Link = "Custom_Mode#Ironclad Cards",       
      Image = "StS2_Mod_CharacterCards.png",
    },
        ["Silent Cards"] = {
      Code = "$SilentCards",
      Text = "Silent cards will now appear in rewards and shops.",
      Link = "Custom_Mode#SilentCards",       
      Image = "StS2_Mod_CharacterCards.png",
    },
        ["Regent Cards"] = {
      Code = "$RegentCards",
      Text = "Regent cards will now appear in rewards and shops.",
      Link = "Custom_Mode#Regent Cards",       
      Image = "StS2_Mod_CharacterCards.png",
    },
        ["Necrobinder Cards"] = {
      Code = "$NecrobinderCards",
      Text = "Necrobinder cards will now appear in rewards and shops.",
      Link = "Custom_Mode#Necrobinder Cards",       
      Image = "StS2_Mod_CharacterCards.png",
    },
        ["Defect Cards"] = {
      Code = "$DefectCards",
      Text = "Defect cards will now appear in rewards and shops.",
      Link = "Custom_Mode#Defect Cards",       
      Image = "StS2_Mod_CharacterCards.png",
    },
        ["Deadly Events"] = {
      Code = "$DeadlyEvents",
      Text = "Unknown rooms can now contain Elites, but are also more likely to contain Treasure rooms.",
      Link = "Custom_Mode#DeadlyEvents",       
      Image = "StS2_Mod_DeadlyEvents.png",
    },
        ["Cursed Run"] = {
      Code = "$CursedRun",
      Text = "At the start of each Act, add a random Curse to your deck.",
      Link = "Custom_Mode#CursedRun",       
      Image = "StS2_Mod_CursedRun.png",
    },
        ["Big Game Hunter"] = {
      Code = "$BigGameHunter",
      Text = "Elite enemies swarm the Spire and drop Rare card rewards.",
      Link = "Custom_Mode#BigGameHunter",       
      Image = "StS2_Mod_BigGameHunter.png",
    },
        ["Midas"] = {
      Code = "$Midas",
      Text = "Enemies drop 200% more gold, but you can no longer Smith at Rest Sites.",
      Link = "Custom_Mode#Midas",       
      Image = "StS2_Mod_Midas.png",
    },
        ["Murderous"] = {
      Code = "$Murderous",
      Text = "You start each combat with 3 $Strength. All enemies start combat with 3 $Strength.",
      Link = "Custom_Mode#Murderous",       
      Image = "StS2_Mod_Murderous.png",
    },
        ["Night Terrors"] = {
      Code = "$NightTerrors",
      Text = "Resting at Rest Sites heals all of your HP, but costs 5 Max HP.",
      Link = "Custom_Mode#NightTerrors",       
      Image = "StS2_Mod_NightTerrors.png",
    },
        ["Terminal"] = {
      Code = "$Terminal",
      Text = "Whenever you enter a new room, lose 1 Max HP. Start each combat with 5 $Plating. ",
      Link = "Custom_Mode#Terminal",       
      Image = "StS2_Mod_Terminal.png",
    },
}

local formatted = {}
for name, keyword in pairs(all_data) do
	keyword.EditLink = "Module:Keywords/StS2_data/Custom_Mode"
	formatted[name] = keyword
end

return formatted