local all_data = {
  ["Strike (Necrobinder)"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Strike.png",
    Type = "Attack",
    Rarity = "Basic",
    Text = "Deal [6|9] damage."
  },
  ["Defend (Necrobinder)"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Defend.png",
    Type = "Skill",
    Rarity = "Basic",
    Text = "Gain [5|8] $Block."
  },
  ["Bodyguard"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Bodyguard.png",
    Type = "Skill",
    Rarity = "Basic",
    Text = "$Summon [5|7]."
  },
  ["Unleash"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Unleash.png",
    Type = "Attack",
    Rarity = "Basic",
    Text = "$Osty deals [6|9] damage.<br>Deals additional damage equal to {{KW|Osty|Osty's|2}} current HP."
  },
  ["Afterlife"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Afterlife.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "$Summon [6|9].<br>$Exhaust."
  },
  ["Blight Strike"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-BlightStrike.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [8|10] damage.<br>Apply $Doom equal to damage dealt."
  },
  ["Defile"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Defile.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "$Ethereal.<br>Deal [13|17] damage."
  },
  ["Defy"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Defy.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "$Ethereal.<br>Gain [6|9] $Block.<br>Apply 1 $Weak."
  },
  ["Drain Power"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-DrainPower.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [10|12] damage.<br>$Upgrade [2|3] random cards in your Discard Pile."
  },
  ["Fear"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Fear.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "$Ethereal.<br>Deal [7|8] damage.<br>Apply [1|2] $Vulnerable."
  },
  ["Flatten"] = {
    Cost = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Flatten.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "$Osty deals [12|16] damage.<br>This card costs 0 @NE if $Osty has attacked this turn."
  },
  ["Grave Warden"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-GraveWarden.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [8|11] $Block.<br>Add a {{C2|Soul}} into your Draw Pile."
  },
  ["Graveblast"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Graveblast.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [4|6] damage.<br>Put a card from your Discard Pile into your Hand.[<br>$Exhaust.|]"
  },
  ["Invoke"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Invoke.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Next turn, $Summon [2|3] and gain [@NE@NE|@NE@NE@NE]."
  },
  ["Negative Pulse"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-NegativePulse.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [5|6] $Block.<br>Apply [7|11] $Doom to ALL enemies."
  },
  ["Poke"] = {
    Cost = 0,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Poke.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "$Osty deals [6|9] damage."
  },
  ["Pull Aggro"] = {
    Cost = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-PullAggro.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "$Summon [4|5].<br>Gain [7|9] $Block."
  },
  ["Reap"] = {
    Cost = 3,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Reap.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "$Retain.<br>Deal [27|33] damage."
  },
  ["Reave"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Reave.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [10|13] damage.<br>Add a {{C2|Soul}}[|+] into your Draw Pile."
  },
  ["Scourge"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Scourge.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Apply [13|16] $Doom.<br>Draw [1 card|2 cards]."
  },
  ["Sculpting Strike"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-SculptingStrike.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [9|12] damage.<br>Add $Ethereal to a card in your Hand."
  },
  ["Snap"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Snap.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "$Osty deals [7|10] damage.<br>Add $Retain to a card in your Hand."
  },
  ["Sow"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Sow.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "$Retain.<br>Deal [8|11] damage to ALL enemies."
  },
  ["Wisp"] = {
    Cost = 0,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Wisp.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "[|$Retain.<br>]Gain @NE.<br>$Exhaust."
  },
  ["Bone Shards"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-BoneShards.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "If $Osty is alive, he deals [9|12] damage to ALL enemies and you gain [9|12] $Block.<br>$Osty dies."
  },
  ["Borrowed Time"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-BorrowedTime.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [4|6]@NE. <br>Cards cost an additional @NE this turn."
  },
  ["Bury"] = {
    Cost = 4,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Bury.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [52|63] damage."
  },
  ["Calcify"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Calcify.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "{{KW|Osty|Osty's|2}} attacks deal [4|6] additional damage."
  },
  ["Capture Spirit"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-CaptureSpirit.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Enemy loses [3|4] HP.<br>Add [3|4] {{C2|Soul|Souls}} into your Draw Pile."
  },
  ["Cleanse"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Cleanse.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Summon [3|5].<br>$Exhaust 1 card from your Draw Pile."
  },
  ["Countdown"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Countdown.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "At the start of your turn, apply [6|9] $Doom to a random enemy."
  },
  ["Danse Macabre"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-DanseMacabre.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you play a card that costs @NE@NE or more, gain [4|6] $Block."
  },
  ["Death March"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-DeathMarch.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [8|9] damage.<br>Deals [4|6] additional damage for each card drawn during your turn."
  },
  ["Death's Door"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-DeathsDoor.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [6|7] $Block.<br>If you applied $Doom this turn, gain $Block 2 additional times."
  },
  ["Deathbringer"] = {
    Cost = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Deathbringer.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Apply [21|26] $Doom and 1 $Weak to ALL enemies."
  },
  ["Debilitate"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Debilitate.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [10|12] damage.<br>$Vulnerable and $Weak are twice as effective against the enemy for the next [2|3] turns."
  },
  ["Delay"] = {
    Cost = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Delay.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [11|13] $Block.<br>Next turn,<br>gain [@NE|@NE@NE]."
  },
  ["Dirge"] = {
    Cost = -1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Dirge.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Summon [3|4] X times.<br>Add X {{C2|Soul|Souls}}[|+] into your Draw Pile.<br>$Exhaust."
  },
  ["Dredge"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Dredge.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "[|$Retain.<br>]Put 3 cards from your Discard Pile into your Hand.<br>$Exhaust."
  },
  ["Enfeebling Touch"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-EnfeeblingTouch.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Ethereal.<br>Enemy loses [8|11] $Strength this turn."
  },
  ["Fetch"] = {
    Cost = 0,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Fetch.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "$Osty deals [3|6] damage.<br>If this is the first time this card has been played this turn, draw 1 card."
  },
  ["Friendship"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Friendship.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Lose [2|1] $Strength.<br>Gain @NE at the start of each turn."
  },
  ["Haunt"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Haunt.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you play a {{C2|Soul}}, a random enemy loses [7|9] HP."
  },
  ["High Five"] = {
    Cost = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-HighFive.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "$Osty deals [11|13] damage<br>and applies [2|3] $Vulnerable<br>to ALL enemies."
  },
  ["Legion of Bone"] = {
    Cost = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-LegionofBone.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "ALL players $Summon [6|8]."
  },
  ["Lethality"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Lethality.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "$Ethereal.<br>The first Attack each turn deals [50%|75%] additional damage."
  },
  ["Melancholy"] = {
    Cost = 3,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Melancholy.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [13|17] $Block.<br>Reduce this card's cost by @NE whenever ANYONE dies."
  },
  ["No Escape"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-NoEscape.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Apply [10|15] $Doom, plus an additional 5 $Doom for every 10 $Doom already on this enemy."
  },
  ["Pagestorm"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Pagestorm.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you draw an $Ethereal card, draw 1 card."
  },
  ["Parse"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Parse.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Ethereal.<br>Draw [3|4] cards."
  },
  ["Pull from Below"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-PullfromBelow.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [5|7] damage for each $Ethereal card played this combat."
  },
  ["Putrefy"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Putrefy.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Apply [2|3] $Weak.<br>Apply [2|3] $Vulnerable.<br>$Exhaust."
  },
  ["Rattle"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Rattle.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "$Osty deals [7|9] damage.<br>Hits an additional time for each other time he has attacked this turn."
  },
  ["Right Hand Hand"] = {
    Cost = 0,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-RightHandHand.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "$Osty deals [4|6] damage.<br>Whenever you play a card that costs @NE@NE or more, return this to your Hand from the Discard Pile."
  },
  ["Severance"] = {
    Cost = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Severance.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [13|18] damage.<br>Add a {{C2|Soul}} into your Draw Pile, Hand, and Discard Pile."
  },
  ["Shroud"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Shroud.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you apply $Doom, gain [3|4] $Block."
  },
  ["Sic 'Em"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-SicEm.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "$Osty deals [5|6] damage.<br>Whenever $Osty hits this enemy this turn, $Summon [3|4]."
  },
  ["Sleight of Flesh"] = {
    Cost = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-SleightofFlesh.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you apply a debuff to an enemy, they take [9|13] damage."
  },
  ["Soulbound"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Soulbound.png",
    Type = "Power",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "[|$Innate.<br>]Choose an ally. Whenever you create a {{C2|Soul}}, add a {{C2|Soul}} to their Draw Pile."
  },
  ["Spur"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Spur.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Retain.<br>$Summon [3|5].<br>$Osty heals [5|7] HP."
  },
  ["Underworld"] = {
    Cost = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Underworld.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Whenever other players deal attack damage this turn, apply that much $Doom.<br>[$Exhaust.|]"
  },
  ["Veilpiercer"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Veilpiercer.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [10|13] damage.<br>The next $Ethereal card you play costs 0 @NE."
  },
  ["Banshee's Cry"] = {
    Cost = 9,
    CostPlus = 7,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-BansheesCry.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal 33 damage to ALL enemies.<br>Costs @NE@NE less for each $Ethereal card played this combat."
  },
  ["Cacophony"] = {
    Cost = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Cacophony.png",
    Type = "Power",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "Every 33 cards drawn by ALL players, deal [66|99] damage to a random enemy."
  },
  ["Call of the Void"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-CalloftheVoid.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "[|$Innate.<br>]At the start of your turn, add 1 random card into your Hand. It gains $Ethereal."
  },
  ["Demesne"] = {
    Cost = 3,
    CostPlus = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Demesne.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "$Ethereal.<br>At the start of your turn, gain @NE and draw 1 additional card."
  },
  ["Devour Life"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-DevourLife.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Whenever you play a {{C2|Soul}}, $Summon [1|2]."
  },
  ["Eidolon"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Eidolon.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Play ALL $Ethereal cards in your $Exhaust Pile.<br>$Exhaust."
  },
  ["End of Days"] = {
    Cost = 3,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-EndofDays.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Apply [29|37] $Doom to ALL enemies.<br>Kill enemies with at least as much $Doom as HP."
  },
  ["Eradicate"] = {
    Cost = -1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Eradicate.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "$Retain.<br>Deal [11|14] damage X times."
  },
  ["Glimpse Beyond"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-GlimpseBeyond.png",
    Type = "Skill",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "ALL players add [3|4] {{C2|Soul|Souls}} into their Draw Pile.<br>$Exhaust."
  },
  ["Hang"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Hang.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [10|13] damage.<br>Double the damage ALL Hang cards deal to this enemy."
  },
  ["Misery"] = {
    Cost = 0,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Misery.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "[|$Retain.<br>]Deal [7|9] damage.<br>Apply any debuffs on the enemy to ALL other enemies."
  },
  ["Necro Mastery"] = {
    Cost = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-NecroMastery.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "$Summon [5|8].<br>Whenever $Osty loses HP,<br>ALL enemies lose that much HP as well."
  },
  ["Neurosurge"] = {
    Cost = 0,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Neurosurge.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Gain [@NE@NE@NE|4@NE].<br>Draw 2 cards.<br>At the start of your turn, apply 3 $Doom to yourself."
  },
  ["Oblivion"] = {
    Cost = 0,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Oblivion.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Whenever you play a card this turn, apply [3|4] $Doom to the enemy."
  },
  ["Reanimate"] = {
    Cost = 3,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Reanimate.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "$Summon [20|25].<br>$Exhaust."
  },
  ["Reaper Form"] = {
    Cost = 3,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-ReaperForm.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "[|$Retain.<br>]Whenever Attacks deal damage, apply that much $Doom."
  },
  ["Sacrifice"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Sacrifice.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "$Retain.<br>If $Osty is alive, he dies and you gain $Block equal to triple his Max HP."
  },
  ["Seance"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Seance.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "$Ethereal.<br>Transform a card in your Draw Pile into {{C2|Soul}}."
  },
  ["Sentry Mode"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-SentryMode.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "At the start of your turn, add 1 {{C2|Sweeping Gaze}} into your Hand."
  },
  ["Shared Fate"] = {
    Cost = 0,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-SharedFate.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Lose 2 $Strength.<br>Enemy loses [2|3] $Strength.<br>$Exhaust."
  },
  ["Soul Storm"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-SoulStorm.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal 9 damage.<br>Deals [4|6] additional damage for each {{C2|Soul}} in your $Exhaust Pile."
  },
  ["Spirit of Ash"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-SpiritofAsh.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Whenever you play an $Ethereal card, gain [4|5] $Block."
  },
  ["Squeeze"] = {
    Cost = 3,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Squeeze.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "$Osty deals [25|30] damage.<br>Deals [5|6] additional damage for ALL your other $Osty Attacks."
  },
  ["The Scythe"] = {
    Cost = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-TheScythe.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal 13 damage.<br>Permanently increase this card's damage by [5|7].<br>$Exhaust."
  },
  ["Time's Up"] = {
    Cost = 2,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-TimesUp.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "[|$Retain.<br>]Deal damage equal to the enemy's $Doom."
  },
  ["Transfigure"] = {
    Cost = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Transfigure.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Add $Replay to a card in your Hand.<br>It costs an extra @NE.[<br>$Exhaust.|]"
  },
  ["Undeath"] = {
    Cost = 0,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Undeath.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Gain [7|9] $Block.<br>Add a copy of this card into your Discard Pile."
  },
  ["Forbidden Grimoire"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-ForbiddenGrimoire.png",
    Type = "Power",
    Rarity = "Ancient",
    Text = "At the end of combat, you may remove a card from your Deck.<br>$Eternal."
  },
  ["Protector"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Necrobinder",
    Image = "StS2_Necrobinder-Protector.png",
    Type = "Attack",
    Rarity = "Ancient",
    Text = "$Osty deals [10|15] damage.<br>Deals additional damage equal to {{KW|Osty|Osty's|2}} Max HP."
  }
}

local formatted = {}
for name, card in pairs(all_data) do
	card.EditLink = "Module:Cards/StS2_data/Necrobinder"
	formatted[name] = card
end

return formatted