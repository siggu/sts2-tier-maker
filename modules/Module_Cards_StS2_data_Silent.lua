local all_data = {
  ["Strike (Silent)"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Strike.png",
    Type = "Attack",
    Rarity = "Basic",
    Text = "Deal [6|9] damage."
  },
  ["Defend (Silent)"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Defend.png",
    Type = "Skill",
    Rarity = "Basic",
    Text = "Gain [5|8] $Block."
  },
  ["Neutralize"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-Neutralize.png",
    Type = "Attack",
    Rarity = "Basic",
    Text = "Deal [3|4] damage.<br>Apply [1|2] $Weak."
  },
  ["Survivor"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Survivor.png",
    Type = "Skill",
    Rarity = "Basic",
    Text = "Gain [8|11] $Block.<br>Discard 1 card."
  },
  ["Anticipate"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-Anticipate.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [2|4] $Dexterity this turn."
  },
  ["Backflip"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Backflip.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [5|8] $Block.<br>Draw 2 cards."
  },
  ["Blade Dance"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-BladeDance.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Add [3|4] {{C2|Shiv|Shivs}} into your Hand.<br>$Exhaust."
  },
  ["Cloak and Dagger"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-CloakandDagger.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain 6 $Block.<br>Add [1|2] {{C2|Shiv}}[|s] into your Hand."
  },
  ["Dagger Spray"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-DaggerSpray.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [4|6] damage to ALL enemies twice."
  },
  ["Dagger Throw"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-DaggerThrow.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [9|12] damage.<br>Draw 1 card.<br>Discard 1 card."
  },
  ["Deadly Poison"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-DeadlyPoison.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Apply [5|7] $Poison."
  },
  ["Deflect"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-Deflect.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [4|7] $Block."
  },
  ["Dodge and Roll"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-DodgeandRoll.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [4|6] $Block.<br>Next turn, gain [4|6] $Block."
  },
  ["Flick-Flack"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Flick-Flack.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "$Sly.<br>Deal [7|9] damage to ALL enemies."
  },
  ["Follow Through"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-FollowThrough.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [7|9] damage.<br>If you have 5 or more other cards in your Hand, hits an additional time.",
    Traits = {NoList=true}
  },
  ["Leading Strike"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-LeadingStrike.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [3|6] damage.<br>Add 2 {{C2|Shiv|Shivs}} into your Hand."
  },
  ["Piercing Wail"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-PiercingWail.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "ALL enemies lose [6|8] $Strength this turn.<br>$Exhaust."
  },
  ["Poisoned Stab"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-PoisonedStab.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [6|8] damage.<br>Apply [3|4] $Poison."
  },
  ["Predator"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-Predator.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [15|20] damage.<br>Next turn, draw 2 cards."
  },
  ["Prepared"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-Prepared.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Draw [1 card|2 cards].<br>Discard [1 card|2 cards]."
  },
  ["Ricochet"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-Ricochet.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "$Sly.<br>Deal 3 damage to a random enemy [4|5] times."
  },
  ["Slice"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-Slice.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [6|9] damage."
  },
  ["Snakebite"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-Snakebite.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "$Retain.<br>Apply [7|10] $Poison."
  },
  ["Sucker Punch"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-SuckerPunch.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [8|10] damage.<br>Apply [1|2] $Weak."
  },
  ["Untouchable"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-Untouchable.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "$Sly.<br>Gain [6|9] $Block."
  },
  ["Accelerant"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Accelerant.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "$Poison is triggered [1|2] additional [time|times]."
  },
  ["Accuracy"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Accuracy.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "{{C2|Shiv|Shivs}} deal [4|6] additional damage."
  },
  ["Acrobatics"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Acrobatics.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Draw [3|4] cards.<br>Discard 1 card."
  },
  ["Backstab"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-Backstab.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "$Innate.<br>Deal [11|15] damage.<br>$Exhaust."
  },
  ["Blade Symphony"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Silent",
    Image = "StS2_Silent-BladeSymphony.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Add 2 {{C2|Shiv|Shivs}} to ALL players' Hands."
  },
  ["Blur"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Blur.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [5|8] $Block.<br>$Block is not removed at the start of your next turn."
  },
  ["Bouncing Flask"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-BouncingFlask.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Apply 3 $Poison to a random enemy [3|4] times."
  },
  ["Bubble Bubble"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-BubbleBubble.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "If the enemy has $Poison, apply [9|12] $Poison."
  },
  ["Calculated Gamble"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-CalculatedGamble.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "[|$Retain.<br>]Discard your Hand,<br>then draw that many cards.<br>$Exhaust."
  },
  ["Concoct"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-Concoct.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Choose another player.<br>Whenever their Attacks deal unblocked damage this turn, they apply [3|4] $Poison."
  },
  ["Dash"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-Dash.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Gain [10|13] $Block.<br>Deal [10|13] damage."
  },
  ["Echoing Slash"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-EchoingSlash.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [10|13] damage to ALL enemies.<br>Repeat this effect for each enemy killed."
  },
  ["Escape Plan"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-EscapePlan.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Draw 1 card.<br>If you draw a Skill, gain [3|5] $Block."
  },
  ["Expertise"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Expertise.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Draw [2|3] cards.<br>They gain $Retain this turn."
  },
  ["Expose"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-Expose.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Remove all Artifact and $Block from the enemy.<br>Apply [2|3] $Vulnerable.<br>$Exhaust."
  },
  ["Fade"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-Fade.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "$Retain. <br> Another player gains [6|9] $Dexterity this turn."
  },
  ["Finisher"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Finisher.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [6|8] damage for each Attack already played this turn."
  },
  ["Flechettes"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Flechettes.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [5|7] damage for each Skill in your Hand."
  },
  ["Sidestep"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-Sidestep.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Next turn, gain [1|2] @SE."
  },
  ["Footwork"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Footwork.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Gain [2|3] $Dexterity."
  },
  ["Hand Trick"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-HandTrick.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [7|10] $Block.<br>Add $Sly to a Skill in your Hand this turn."
  },
  ["Haze"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-Haze.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Apply [4|6] $Poison and [1|2] $Weak to ALL enemies."
  },
  ["Hidden Daggers"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-HiddenDaggers.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Discard 2 cards.<br>Add 2 {{C2|Shiv|Shivs}}[|+] into your Hand." 
  },
  ["Infinite Blades"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-InfiniteBlades.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "[|$Innate.<br>]At the start of your turn, add 1 {{C2|Shiv}} into your Hand."
  },
  ["Leg Sweep"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-LegSweep.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Apply [2|3] $Weak.<br>Gain [11|14] $Block."
  },
  ["Memento Mori"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-MementoMori.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [9|11] damage.<br>Deals [4|5] additional damage for each card discarded this turn."
  },
  ["Mirage"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Mirage.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain $Block equal to $Poison on ALL enemies. <br>[$Exhaust|]"
  },
  ["Noxious Fumes"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-NoxiousFumes.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "At the start of your turn, apply [2|3] $Poison to ALL enemies."
  },
  ["Phantom Blades"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-PhantomBlades.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "{{C2|Shiv|Shivs}} gain $Retain.<br>The first {{C2|Shiv}} you play each turn deals [9|12] additional damage."
  },
  ["Pinpoint"] = {
    Cost = 3,
    Color = "Silent",
    Image = "StS2_Silent-Pinpoint.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [15|19] damage.<br>Costs 1 less @SE for each Skill played this turn."
  },
  ["Pounce"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-Pounce.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [14|20] damage.<br>The next Skill you play costs 0 @SE."
  },
  ["Precise Cut"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-PreciseCut.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [13|16] damage.<br>Deals 2 less damage for each other card in your Hand."
  },
  ["Reflex"] = {
    Cost = 3,
    Color = "Silent",
    Image = "StS2_Silent-Reflex.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Sly.<br>Draw [2|3] cards."
  },
  ["Skewer"] = {
    Cost = -1,
    Color = "Silent",
    Image = "StS2_Silent-Skewer.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [8|11] damage X times."
  },
  ["Speedster"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-Speedster.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "[|$Innate.<br>]Whenever you draw a card during your turn, deal 2 damage to ALL enemies."
  },
  ["Strangle"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Strangle.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [8|10] damage.<br>Whenever you play a card this turn, the enemy loses [2|3] HP."
  },
  ["Tactician"] = {
    Cost = 3,
    Color = "Silent",
    Image = "StS2_Silent-Tactician.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Sly.<br>Gain [@SE|@SE@SE]."
  },
  ["Up My Sleeve"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-UpMySleeve.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Add [3|4] {{C2|Shiv|Shivs}} into your Hand.<br>Reduce this card's cost by 1."
  },
  ["Well-Laid Plans"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Silent",
    Image = "StS2_Silent-Well-LaidPlans.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "At the end of your turn, you no longer discard your Hand."
  },
  ["Abrasive"] = {
    Cost = 3,
    Color = "Silent",
    Image = "StS2_Silent-Abrasive.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "$Sly.<br>Gain 1 $Dexterity.<br>Gain [4|6] $Thorns."
  },
  ["Adrenaline"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-Adrenaline.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Gain [@SE|@SE@SE].<br>Draw 2 cards.<br>$Exhaust."
  },
  ["Afterimage"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Afterimage.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "[|$Innate.<br>]Whenever you play a card, gain 1 $Block."
  },
  ["Assassinate"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-Assassinate.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "$Innate.<br>Deal [10|13] damage.<br>Apply [1|2] $Vulnerable.<br>$Exhaust."
  },
  ["Blade of Ink"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-BladeofInk.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Add [2|3] $Inky {{C2|Shiv|Shivs}} into your Hand."
  },
  ["Bullet Time"] = {
    Cost = 3,
    CostPlus = 2,
    Color = "Silent",
    Image = "StS2_Silent-BulletTime.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "You cannot draw additional cards this turn. ALL cards in your Hand are free to play this turn."
  },
  ["Burst"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-Burst.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "This turn, your next [Skill is|2 Skills are] played an extra time."
  },
  ["Corrosive Wave"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-CorrosiveWave.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Whenever you draw a card this turn, apply [2|3] $Poison to ALL enemies."
  },
  ["Envenom"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-Envenom.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Whenever an Attack deals unblocked damage, apply [1|2] $Poison."
  },
  ["Fan of Knives"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-FanofKnives.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "{{C2|Shiv|Shivs}} now hit ALL enemies.<br>Add [4|5] {{C2|Shiv|Shivs}} into your Hand."
  },
  ["Flanking"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Silent",
    Image = "StS2_Silent-Flanking.png",
    Type = "Skill",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "The enemy takes double damage from other players this turn."
  },
  ["Grand Finale"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-GrandFinale.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Can only be played if there are no cards in your Draw Pile. Deal [60|75] damage to ALL enemies."
  },
  ["Knife Trap"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-KnifeTrap.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "[Play|Upgrade and play] every {{C2|Shiv}} in your $Exhaust Pile on the enemy."
  },
  ["Malaise"] = {
    Cost = -1,
    Color = "Silent",
    Image = "StS2_Silent-Malaise.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Enemy loses [X|X+1] $Strength.<br>Apply [X|X+1] $Weak.<br>$Exhaust."
  },
  ["Master Planner"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Silent",
    Image = "StS2_Silent-MasterPlanner.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "When you play a Skill, it gains $Sly."
  },
  ["Murder"] = {
    Cost = 3,
    CostPlus = 2,
    Color = "Silent",
    Image = "StS2_Silent-Murder.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal 1 damage.<br>Deals 1 additional damage for each card drawn this combat."
  },
  ["Nightmare"] = {
    Cost = 3,
    CostPlus = 2,
    Color = "Silent",
    Image = "StS2_Silent-Nightmare.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Choose a card.<br>Next turn, add 3 copies of that card into your Hand.<br>$Exhaust."
  },
  ["Outbreak"] = {
    Cost = 3,
    Color = "Silent",
    Image = "StS2_Silent-Outbreak.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Apply [9|12] $Poison to ALL enemies.<br>$Poison triggers immediately."
  },
  ["Serpent Form"] = {
    Cost = 3,
    Color = "Silent",
    Image = "StS2_Silent-SerpentForm.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Whenever you play a card, deal [4|6] damage to a random enemy."
  },
  ["Shadow Step"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Silent",
    Image = "StS2_Silent-ShadowStep.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Discard your Hand.<br>Next turn, Attacks deal double damage."
  },
  ["Shadowmeld"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Silent",
    Image = "StS2_Silent-Shadowmeld.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Double your $Block gain this turn."
  },
  ["Sneaky"] = {
    Cost = 2,
    Color = "Silent",
    Image = "StS2_Silent-Sneaky.png",
    Type = "Power",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "$Sly.<br>Whenever another player attacks an enemy, gain [1|2] $Block."
  },
  ["Storm of Steel"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-StormofSteel.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Discard your Hand.<br>Add 1 {{C2|Shiv}}[|+] into your Hand for each card discarded."
  },
  ["The Hunt"] = {
    Cost = 1,
    Color = "Silent",
    Image = "StS2_Silent-TheHunt.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [10|15] damage.<br>If Fatal, gain an additional card reward.<br>$Exhaust."
  },
  ["Tools of the Trade"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Silent",
    Image = "StS2_Silent-ToolsoftheTrade.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "At the start of your turn, draw 1 card and discard 1 card."
  },
  ["Tracking"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Silent",
    Image = "StS2_Silent-Tracking.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "$Weak enemies take 50% more damage from Attacks."
  },
  ["Suppress"] = {
    Cost = 0,
    Color = "Silent",
    Image = "StS2_Silent-Suppress.png",
    Type = "Attack",
    Rarity = "Ancient",
    Text = "$Innate.<br>Deal [11|17] damage.<br>Apply [3|5] $Weak."
  },
  ["Wraith Form"] = {
    Cost = 3,
    Color = "Silent",
    Image = "StS2_Silent-WraithForm.png",
    Type = "Power",
    Rarity = "Ancient",
    Text = "Gain [2|3] $Intangible.<br>At the start of your turn, lose 1 $Dexterity."
  },
}

local formatted = {}
for name, card in pairs(all_data) do
	card.EditLink = "Module:Cards/StS2_data/Silent"
	formatted[name] = card
end

return formatted