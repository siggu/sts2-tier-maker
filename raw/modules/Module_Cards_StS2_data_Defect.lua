local all_data = {
  ["Strike (Defect)"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Strike.png",
    Type = "Attack",
    Rarity = "Basic",
    Text = "Deal [6|9] damage."
  },
  ["Defend (Defect)"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Defend.png",
    Type = "Skill",
    Rarity = "Basic",
    Text = "Gain [5|8] $Block."
  },
  ["Dualcast"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Defect",
    Image = "StS2_Defect-Dualcast.png",
    Type = "Skill",
    Rarity = "Basic",
    Text = "$Evoke your rightmost Orb twice."
  },
  ["Zap"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Defect",
    Image = "StS2_Defect-Zap.png",
    Type = "Skill",
    Rarity = "Basic",
    Text = "$Channel 1 $Lightning."
  },
  ["Ball Lightning"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-BallLightning.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [7|10] damage.<br>$Channel 1 $Lightning."
  },
  ["Barrage"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Barrage.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [5|7] damage for each $Channeled Orb."
  },
  ["Beam Cell"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-BeamCell.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [3|4] damage.<br>Apply [1|2] $Vulnerable."
  },
  ["Boost Away"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-BoostAway.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [6|9] $Block.<br>Add a {{C2|Dazed}} into your Discard Pile."
  },
  ["Charge Battery"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-ChargeBattery.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [7|10] $Block.<br>Next turn, gain @DE."
  },
  ["Claw"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-Claw.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [3|4] damage.<br>Increase the damage of ALL Claw cards by [2|3] this combat."
  },
  ["Cold Snap"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-ColdSnap.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [6|9] damage.<br>$Channel 1 $Frost."
  },
  ["Compile Driver"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-CompileDriver.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [7|10] damage.<br>Draw 1 card for each unique Orb you have."
  },
  ["Coolheaded"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Coolheaded.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "$Channel 1 $Frost.<br>Draw [1 card|2 cards]."
  },
  ["Focused Strike"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-FocusedStrike.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [9|11] damage.<br>Gain [1|2] $Focus this turn."
  },
  ["Go for the Eyes"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-GofortheEyes.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [3|4] damage.<br>If the enemy intends to attack, apply [1|2] $Weak."
  },
  ["Gunk Up"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-GunkUp.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [4|5] damage 3 times.<br>Add a {{C2|Slimed}} into your Discard Pile."
  },
  ["Hologram"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Hologram.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [3|5] $Block.<br>Put a card from your Discard Pile into your Hand.[<br>$Exhaust.|]"
  },
  ["Hotfix"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-Hotfix.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain 2 $Focus this turn.<br>[$Exhaust.|]"
  },
  ["Leap"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Leap.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [9|12] $Block."
  },
  ["Lightning Rod"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-LightningRod.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [4|7] $Block.<br>At the start of the next 2 turns, $Channel 1 $Lightning."
  },
  ["Momentum Strike"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-MomentumStrike.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [11|15] damage.<br>Reduce this card's cost to 0 @DE."
  },
  ["Sweeping Beam"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-SweepingBeam.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [6|9] damage to ALL enemies.<br>Draw 1 card."
  },
  ["TURBO"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-TURBO.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [@DE@DE|@DE@DE@DE].<br>Add a {{C2|Void}} into your Discard Pile."
  },
  ["Uproar"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-Uproar.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [6|8] damage twice.<br>Play a random Attack from your Draw Pile."
  },
  ["Boot Sequence"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-BootSequence.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Innate.<br>Gain [10|13] $Block.<br>$Exhaust."
  },
  ["Bulk Up"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-BulkUp.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Lose 1 Orb Slot.<br>Gain [2|3] $Strength.<br>Gain [2|3] $Dexterity."
  },
  ["Capacitor"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Capacitor.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Gain [2|3] Orb Slots."
  },
  ["Chaos"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Chaos.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Channel [1|2] random [Orb|Orbs]."
  },
  ["Chill"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-Chill.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Channel 1 $Frost for each enemy.[<br>$Exhaust.|]"
  },
  ["Compact"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Compact.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [6|7] $Block.<br>$Transform all Status cards in your Hand into {{C2|Fuel}}[|+]."
  },
  ["Darkness"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Darkness.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Channel 1 $Dark.<br>Trigger the passive ability of all $Dark Orbs[| twice]."
  },
  ["Double Energy"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Defect",
    Image = "StS2_Defect-DoubleEnergy.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Double your Energy.<br>$Exhaust."
  },
  ["Energy Surge"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-EnergySurge.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "ALL players gain [@DE@DE|@DE@DE@DE].<br>$Exhaust."
  },
  ["FTL"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-FTL.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [5|6] damage.<br>If you have played fewer than [3|4] cards this turn, draw 1 card."
  },
  ["Feral"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Defect",
    Image = "StS2_Defect-Feral.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "The first time you play a<br>0 @DE Attack each turn,<br>return it to your Hand."
  },
  ["Fight Through"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-FightThrough.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [13|17] $Block.<br>Add 2 {{C2|Wound|Wounds}} into your Discard Pile."
  },
  ["Fusion"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Fusion.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Channel 1 $Plasma.[<br> $Exhaust.|]"
  },
  ["Glacier"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-Glacier.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [6|9] $Block.<br>$Channel 2 $Frost."
  },
  ["Glasswork"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Glasswork.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [5|8] $Block.<br>$Channel 1 $Glass."
  },
  ["Hailstorm"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Hailstorm.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "At the end of your turn, if you have $Frost, deal [6|8] damage to ALL enemies."
  },
  ["Hibernate"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-Hibernate.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "This turn, your $Frost grants ALL allies $Block.<br>Channel [2|3] $Frost."
  },
  ["Ignition"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Ignition.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Another player $Channels $Plasma.[<br>$Exhaust.|]"
  },
  ["Iteration"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Iteration.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "The first time you draw a Status card each turn, draw [2|3] cards."
  },
  ["Loop"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Loop.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "At the start of your turn, trigger the passive ability of your rightmost Orb[| 2 times]."
  },
  ["Null"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-Null.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [10|13] damage.<br>Apply [1|2] $Weak.<br>$Channel 1 $Dark."
  },
  ["Overclock"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-Overclock.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Draw [2|3] cards.<br>Add a {{C2|Burn}} into your Discard Pile."
  },
  ["Refract"] = {
    Cost = 3,
    Color = "Defect",
    Image = "StS2_Defect-Refract.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [10|13] damage twice.<br>$Channel 2 $Glass."
  },
  ["Rocket Punch"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-RocketPunch.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [13|14] damage.<br>Draw [1 card|2 cards].<br>Whenever you create a Status, reduce this card's cost by 1 @DE until played."
  },
  ["Scavenge"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Scavenge.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Exhaust a card.<br>Next turn, gain [@DE@DE|@DE@DE@DE]."
  },
  ["Scrape"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Scrape.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [7|10] damage.<br>Draw [4|5] cards.<br>Discard all cards drawn this way that do not cost 0 @DE."
  },
  ["Shadow Shield"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-ShadowShield.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [11|15] $Block.<br>$Channel 1 $Dark."
  },
  ["Skim"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Skim.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Draw [3|4] cards."
  },
  ["Smokestack"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Smokestack.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you create a Status, deal [5|7] damage to ALL enemies."
  },
  ["Storm"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Storm.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you play a Power, $Channel [1|2] $Lightning."
  },
  ["Subroutine"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Defect",
    Image = "StS2_Defect-Subroutine.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you play a Power, gain @DE."
  },
  ["Sunder"] = {
    Cost = 3,
    Color = "Defect",
    Image = "StS2_Defect-Sunder.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [26|34] damage.<br>If this kills an enemy, gain @DE@DE@DE."
  },
  ["Synchronize"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Synchronize.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [1|2] $Focus this turn for each unique Orb you have."
  },
  ["Synthesis"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-Synthesis.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [14|20] damage.<br>The next Power you play costs 0 @DE."
  },
  ["Tempest"] = {
    Cost = -1,
    Color = "Defect",
    Image = "StS2_Defect-Tempest.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Channel [X|X+1] $Lightning."
  },
  ["Tesla Coil"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-TeslaCoil.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [3|4] damage.<br>Trigger all $Lightning against the enemy[| twice]."
  },
  ["Thunder"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Thunder.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you $Evoke $Lightning, deal [8|11] damage to each enemy hit."
  },
  ["White Noise"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Defect",
    Image = "StS2_Defect-WhiteNoise.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Add a random Power into your Hand. It's free to play this turn.<br>$Exhaust."
  },
  ["Adaptive Strike"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-AdaptiveStrike.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [18|23] damage.<br>Add a 0 @DE copy of this card into your Discard Pile."
  },
  ["All for One"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-AllforOne.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [10|14] damage.<br>Put ALL 0 @DE cards from your Discard Pile into your Hand."
  },
  ["Buffer"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-Buffer.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Prevent the next [time|2 times] you would lose HP."
  },
  ["Consuming Shadow"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-ConsumingShadow.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "$Channel [2|3] $Dark.<br>At the end of your turn, $Evoke your leftmost Orb."
  },
  ["Coolant"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Coolant.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "At the start of your turn, gain [2|3] $Block for each unique Orb you have."
  },
  ["Creative AI"] = {
    Cost = 3,
    CostPlus = 2,
    Color = "Defect",
    Image = "StS2_Defect-CreativeAI.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "At the start of your turn, add a random Power into your Hand."
  },
  ["Defragment"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Defragment.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Gain [1|2] $Focus."
  },
  ["Echo Form"] = {
    Cost = 3,
    Color = "Defect",
    Image = "StS2_Defect-EchoForm.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "[$Ethereal. <br>|] The first card you play each turn is played an extra time."
  },
  ["Flak Cannon"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-FlakCannon.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "$Exhaust ALL your Status cards.<br>Deal [8|11] damage to a random enemy for each card $Exhausted."
  },
  ["Genetic Algorithm"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-GeneticAlgorithm.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Gain 1 $Block.<br>Permanently increase this card's $Block by [3|4].<br>$Exhaust."
  },
  ["Helix Drill"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-HelixDrill.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [3|5] damage for each @DE spent on other cards this turn."
  },
  ["Hyperbeam"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-Hyperbeam.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [24|30] damage to ALL enemies. Lose 3 $Focus this turn."
  },
  ["Ice Lance"] = {
    Cost = 3,
    Color = "Defect",
    Image = "StS2_Defect-IceLance.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [19|24] damage.<br>$Channel 3 $Frost."
  },
  ["Imitation Learning"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-ImitationLearning.png",
    Type = "Skill",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "Choose another player. The next [2|3] times they play a Power, you play a copy of it.<br>$Exhaust."
  },
  ["Machine Learning"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-MachineLearning.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "[|$Innate.<br>]At the start of your turn, draw 1 additional card."
  },
  ["Meteor Strike"] = {
    Cost = 5,
    Color = "Defect",
    Image = "StS2_Defect-MeteorStrike.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [24|30] damage.<br>$Channel 3 $Plasma."
  },
  ["Modded"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-Modded.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Gain 1 Orb Slot.<br>Draw [1 card|2 cards]. Increase this card's cost by 1."
  },
  ["Multi-Cast"] = {
    Cost = -1,
    Color = "Defect",
    Image = "StS2_Defect-Multi-Cast.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "$Evoke your rightmost Orb [X|X+1] times."
  },
  ["One for All"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-OneforAll.png",
    Type = "Power",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "EVERYONE'S 0 energy Attacks deal [3|4] additional damage."
  },
  ["Rainbow"] = {
    Cost = 2,
    Color = "Defect",
    Image = "StS2_Defect-Rainbow.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "$Channel 1 $Lightning.<br>$Channel 1 $Frost.<br>$Channel 1 $Dark.[<br>$Exhaust.|]"
  },
  ["Reboot"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-Reboot.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Shuffle ALL your cards into your Draw Pile.<br>Draw [4|6] cards.<br>$Exhaust."
  },
  ["Shatter"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Shatter.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [7|11] damage to ALL enemies.<br>$Evoke all of your Orbs twice.<br>$Exhaust."
  },
  ["Signal Boost"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Defect",
    Image = "StS2_Defect-SignalBoost.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "The next Power you play is played an additional time.<br>$Exhaust."
  },
  ["Spinner"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-Spinner.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "[|$Channel 1 $Glass.<br>]At the start of your turn, $Channel 1 $Glass."
  },
  ["Supercritical"] = {
    Cost = 0,
    Color = "Defect",
    Image = "StS2_Defect-Supercritical.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Gain [4 @DE|6 @DE].<br>$Exhaust."
  },
  ["Trash to Treasure"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Defect",
    Image = "StS2_Defect-TrashtoTreasure.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Whenever you create a Status, $Channel 1 random Orb."
  },
  ["Voltaic"] = {
    Cost = 3,
    Color = "Defect",
    Image = "StS2_Defect-Voltaic.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "$Channel $Lightning equal to the $Lightning already $Channeled this combat.[<br>$Exhaust.|]"
  },
  ["Biased Cognition"] = {
    Cost = 1,
    Color = "Defect",
    Image = "StS2_Defect-BiasedCognition.png",
    Type = "Power",
    Rarity = "Ancient",
    Text = "Gain [5|6] $Focus.<br>At the start of your turn, lose 1 $Focus."
  },
  ["Quadcast"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Defect",
    Image = "StS2_Defect-Quadcast.png",
    Type = "Skill",
    Rarity = "Ancient",
    Text = "$Evoke your rightmost Orb 4 times."
  }
}

local formatted = {}
for name, card in pairs(all_data) do
	card.EditLink = "Module:Cards/StS2_data/Defect"
	formatted[name] = card
end

return formatted