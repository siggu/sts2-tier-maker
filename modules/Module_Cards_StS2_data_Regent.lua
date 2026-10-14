local all_data = {
  ["Strike (Regent)"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Strike.png",
    Type = "Attack",
    Rarity = "Basic",
    Text = "Deal [6|9] damage."
  },
  ["Defend (Regent)"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Defend.png",
    Type = "Skill",
    Rarity = "Basic",
    Text = "Gain [5|8] $Block."
  },
  ["Falling Star"] = {
    Cost = 0,
    StarCost = 2,
    Color = "Regent",
    Image = "StS2_Regent-FallingStar.png",
    Type = "Attack",
    Rarity = "Basic",
    Text = "Deal [8|12] damage.<br>Apply 1 $Weak.<br>Apply 1 $Vulnerable."
  },
  ["Venerate"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Venerate.png",
    Type = "Skill",
    Rarity = "Basic",
    Text = "Gain [@ST@ST|@ST@ST@ST]."
  },
  ["Astral Pulse"] = {
    Cost = 0,
    StarCost = 3,
    Color = "Regent",
    Image = "StS2_Regent-AstralPulse.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [6|8] damage to ALL enemies twice."
  },
  ["BEGONE!"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-BEGONE.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Choose a card in your Hand to Transform into {{C2|Minion Strike}}[|+]."
  },
  ["Celestial Might"] = {
    Cost = 2,
    Color = "Regent",
    Image = "StS2_Regent-CelestialMight.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal 6 damage [3|4] times."
  },
  ["Cloak of Stars"] = {
    Cost = 0,
    StarCost = 1,
    Color = "Regent",
    Image = "StS2_Regent-CloakofStars.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [7|10] $Block."
  },
  ["Collision Course"] = {
    Cost = 0,
    Color = "Regent",
    Image = "StS2_Regent-CollisionCourse.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [10|14] damage.<br>Add a {{C2|Debris}} into your Hand."
  },
  ["Cosmic Indifference"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-CosmicIndifference.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [6|9] $Block.<br>Put a card from your Discard Pile on top of your Draw Pile."
  },
  ["Crescent Spear"] = {
    Cost = 1,
    StarCost = 1,
    Color = "Regent",
    Image = "StS2_Regent-CrescentSpear.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal 8 damage.<br>Deals [2|3] additional damage for ALL your cards that have a @ST cost."
  },
  ["Crush Under"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-CrushUnder.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [8|9] damage to ALL enemies. All enemies lose [1|2] $Strength this turn."
  },
  ["Gather Light"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-GatherLight.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [8|11] $Block.<br>Gain @ST."
  },
  ["Glitterstream"] = {
    Cost = 2,
    Color = "Regent",
    Image = "StS2_Regent-Glitterstream.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [11|13] $Block.<br>Next turn, gain [5|7] $Block."
  },
  ["Glow"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Glow.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [@ST|@ST@ST].<br>Draw 1 card. Next turn, draw 1 card"
  },
  ["Guiding Star"] = {
    Cost = 1,
    StarCost = 2,
    Color = "Regent",
    Image = "StS2_Regent-GuidingStar.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [12|13] damage.<br>Draw [2|3] cards."
  },
  ["Hidden Cache"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-HiddenCache.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain @ST.<br>Next turn, gain [@ST@ST@ST|@ST@ST@ST@ST]."
  },
  ["Know Thy Place"] = {
    Cost = 0,
    Color = "Regent",
    Image = "StS2_Regent-KnowThyPlace.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Apply 1 $Weak.<br>Apply 1 $Vulnerable.[<br>$Exhaust.|]"
  },
  ["Patter"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Patter.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [8|10] $Block.<br>Gain [2|3] $Vigor."
  },
  ["Photon Cut"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-PhotonCut.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [10|13] damage.<br>Draw [1 card|2 cards].<br>Put 1 card from your Hand on top of your Draw Pile."
  },
  ["Refine Blade"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-RefineBlade.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "$Forge [8|12].<br>Next turn, gain @RE."
  },
  ["Solar Strike"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-SolarStrike.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [9|10] damage.<br>Gain [@ST|@ST@ST]."
  },
  ["Spoils of Battle"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-SpoilsofBattle.png",
    Type = "Skill",
    Rarity = "Common",
    Text = " $Forge [6|9]. <br>Draw 2 cards."
  },
  ["Wrought in War"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-WroughtinWar.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [7|9] damage.<br>$Forge [7|9]."
  },
  ["Alignment"] = {
    Cost = 0,
    StarCost = 2,
    Color = "Regent",
    Image = "StS2_Regent-Alignment.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [@RE@RE|@RE@RE@RE]."
  },
  ["Black Hole"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-BlackHole.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you spend or gain @ST, deal [3|4] damage to ALL enemies."
  },
  ["Bulwark"] = {
    Cost = 2,
    Color = "Regent",
    Image = "StS2_Regent-Bulwark.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [12|15] $Block.<br>$Forge [10|13]."
  },
  ["CHARGE!!"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-CHARGE.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Choose 2 cards in your Draw Pile to Transform into {{C2|Minion Dive Bomb}}[|+]."
  },
  ["Child of the Stars"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-ChildoftheStars.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you spend @ST , gain [2|3] $Block for each @ST  spent."
  },
  ["Conqueror"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Conqueror.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Forge [3|5].<br>{{C2|Sovereign Blade}} deals double damage to the enemy this turn."
  },
  ["Constellation"] = {
    Cost = 0,
    StarCost = 2,
    Color = "Regent",
    Image = "StS2_Regent-Constellation.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Another player draws 1 card, gains @RE, and gains [9|12] $Block."
  },
  ["Convergence"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Convergence.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Next turn,<br>gain @RE and [@ST|@ST@ST].<br>$Retain your Hand this turn."
  },
  ["Devastate"] = {
    Cost = 1,
    StarCost = 4,
    Color = "Regent",
    Image = "StS2_Regent-Devastate.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [35|45] damage."
  },
  ["Furnace"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Furnace.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "At the start of your turn, $Forge [5|7]."
  },
  ["Gamma Blast"] = {
    Cost = 0,
    StarCost = 3,
    Color = "Regent",
    Image = "StS2_Regent-GammaBlast.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [13|18] damage.<br>Apply 2 $Weak.<br>Apply 2 $Vulnerable."
  },
  ["Glimmer"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Glimmer.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Draw [3|4] cards.<br>Put 1 card from your Hand on top of your Draw Pile."
  },
  ["Hegemony"] = {
    Cost = 2,
    Color = "Regent",
    Image = "StS2_Regent-Hegemony.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [15|18] damage.<br>Next turn, gain [@RE@RE|@RE@RE@RE]."
  },
  ["Kingly Kick"] = {
    Cost = 4,
    Color = "Regent",
    Image = "StS2_Regent-KinglyKick.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [27|35] damage.<br>Whenever you draw this card, reduce its cost by 1."
  },
  ["Kingly Punch"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-KinglyPunch.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [8|10] damage.<br>Whenever you draw this card, increase its damage by [4|6] this combat."
  },
  ["Knockout Blow"] = {
    Cost = 3,
    Color = "Regent",
    Image = "StS2_Regent-KnockoutBlow.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [30|38] damage.<br>If this kills an enemy, gain @ST@ST@ST@ST@ST."
  },
  ["Largesse"] = {
    Cost = 0,
    Color = "Regent",
    Image = "StS2_Regent-Largesse.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Another player adds 1 random[| $Upgraded] Colorless card to their Hand."
  },
  ["Lunar Blast"] = {
    Cost = 0,
    Color = "Regent",
    Image = "StS2_Regent-LunarBlast.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [4|5] damage for each Skill already played this turn."
  },
  ["Manifest Authority"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-ManifestAuthority.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [7|8] $Block.<br>Add 1 random[| $Upgraded] Colorless card into your Hand."
  },
  ["Monologue"] = {
    Cost = 0,
    Color = "Regent",
    Image = "StS2_Regent-Monologue.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "[|$Retain.<br>]Whenever you play a card this turn, gain 1 $Strength this turn."
  },
  ["Orbit"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Regent",
    Image = "StS2_Regent-Orbit.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Every 4 @RE you spend,<br>gain @RE."
  },
  ["Pale Blue Dot"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-PaleBlueDot.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "If you play 5 or more cards in a turn, draw [1 card|2 cards] at the start of your next turn."
  },
  ["Parry"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Parry.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "{{C2|Sovereign Blade}} now gains <br> [10|14] $Block."
  },
  ["Particle Wall"] = {
    Cost = 0,
    StarCost = 2,
    Color = "Regent",
    Image = "StS2_Regent-ParticleWall.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [9|12] $Block.<br>Return this card to your Hand."
  },
  ["Plot"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Plot.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Next turn, ALL players draw [2|3] cards."
  },
  ["Pillar of Creation"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-PillarofCreation.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you create a card, gain [2|3] $Block."
  },
  ["Prophesize"] = {
    Cost = 2,
    Color = "Regent",
    Image = "StS2_Regent-Prophesize.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Draw [6|9] cards."
  },
  ["Quasar"] = {
    Cost = 0,
    StarCost = 2,
    Color = "Regent",
    Image = "StS2_Regent-Quasar.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Choose 1 of 3 random[| $Upgraded] Colorless cards to add into your Hand."
  },
  ["Radiate"] = {
    Cost = 0,
    Color = "Regent",
    Image = "StS2_Regent-Radiate.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [3|4] damage to ALL enemies for each @ST  gained this turn."
  },
  ["Reflect"] = {
    Cost = 1,
    StarCost = 3,
    Color = "Regent",
    Image = "StS2_Regent-Reflect.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [15|20] $Block.<br>$Blocked attack damage is reflected to your attacker this turn."
  },
  ["Resonance"] = {
    Cost = 1,
    StarCost = 2,
    Color = "Regent",
    Image = "StS2_Regent-Resonance.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [1|2] $Strength. ALL enemies lose 1 $Strength."
  },
  ["Royal Gamble"] = {
    Cost = 0,
    StarCost = 5,
    Color = "Regent",
    Image = "StS2_Regent-RoyalGamble.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "[|$Retain.<br>]Gain 9 @ST.<br>$Exhaust."
  },
  ["Shining Strike"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-ShiningStrike.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [8|11] damage.<br>Gain @ST@ST.<br>Put this card on top of your Draw Pile."
  },
  ["Spectrum Shift"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Regent",
    Image = "StS2_Regent-SpectrumShift.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "At the start of your turn, add 1 random Colorless card into your Hand."
  },
  ["Stardust"] = {
    Cost = 0,
    StarCost = -1,
    Color = "Regent",
    Image = "StS2_Regent-Stardust.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [5|7] damage to a random enemy X times."
  },
  ["Summon Forth"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-SummonForth.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Forge [8|11].<br>Put {{C2|Sovereign Blade}} into your Hand from anywhere."
  },
  ["Supermassive"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Supermassive.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal 5 damage.<br>Deals [3|4] additional damage for each card you created this combat."
  },
  ["Terraforming"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Terraforming.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [7|10] $Vigor."
  },
  ["Arsenal"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Arsenal.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "[|$Innate.<br>]Whenever you create a card, gain 1 $Strength."
  },
  ["Beat into Shape"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-BeatintoShape.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [5|7] damage.<br>$Forge [5|7].<br>$Forges an additional [5|7] for every other time you've hit the enemy this turn."
  },
  ["Big Bang"] = {
    Cost = 0,
    Color = "Regent",
    Image = "StS2_Regent-BigBang.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "[|$Innate.<br>]Draw 1 card.<br>Gain @RE.<br>Gain @ST.<br>$Forge 5.<br>$Exhaust."
  },
  ["Bombardment"] = {
    Cost = 3,
    Color = "Regent",
    Image = "StS2_Regent-Bombardment.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [18|24] damage.<br>At the start of your turn, if this is in your $Exhaust Pile, <br> play it.<br>$Exhaust."
  },
  ["Bundle of Joy"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-BundleofJoy.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Add [3|4] random Colorless cards into your Hand.<br>$Exhaust."
  },
  ["Comet"] = {
    Cost = 0,
    StarCost = 5,
    Color = "Regent",
    Image = "StS2_Regent-Comet.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [33|44] damage.<br>Apply 3 $Weak.<br>Apply 3 $Vulnerable."
  },
  ["Crash Landing"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-CrashLanding.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [21|26] damage to ALL enemies.<br>Fill your Hand with {{C2|Debris}}."
  },
  ["Decisions, Decisions"] = {
    Cost = 0,
    StarCost = 6,
    Color = "Regent",
    Image = "StS2_Regent-DecisionsDecisions.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Draw [3|5] cards.<br>Choose a Skill in your Hand and play it 3 times.<br>$Exhaust."
  },
  ["Dying Star"] = {
    Cost = 1,
    StarCost = 3,
    Color = "Regent",
    Image = "StS2_Regent-DyingStar.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Ethereal.<br>Deal [9|11] damage to ALL enemies. ALL enemies lose [9|11] $Strength this turn."
  },
  ["Foregone Conclusion"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-ForegoneConclusion.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Next turn, put [2|3] cards from your Draw Pile into your Hand."
  },
  ["GUARDS!!!"] = {
    Cost = 2,
    Color = "Regent",
    Image = "StS2_Regent-GUARDS.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Transform any number of cards in your Hand into {{C2|Minion Sacrifice}}[|+].<br>$Exhaust."
  },
  ["Genesis"] = {
    Cost = 2,
    Color = "Regent",
    Image = "StS2_Regent-Genesis.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "At the start of your turn, gain [@ST@ST|@ST@ST@ST]."
  },
  ["Hammer Time"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Regent",
    Image = "StS2_Regent-HammerTime.png",
    Type = "Power",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "Whenever you $Forge, all allies $Forge as well."
  },
  ["Heavenly Drill"] = {
    Cost = -1,
    Color = "Regent",
    Image = "StS2_Regent-HeavenlyDrill.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [8|10] damage X times.<br>Double X if it's 4 or more."
  },
  ["Heirloom Hammer"] = {
    Cost = 2,
    Color = "Regent",
    Image = "StS2_Regent-HeirloomHammer.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [20|25] damage.<br>Choose a Colorless card in your Hand. Add a copy of that card into your Hand."
  },
  ["I Am Invincible"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-IAmInvincible.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Gain [10|13] $Block.<br>At the end of your turn, if this is on top of your Draw Pile, play it."
  },
  ["Make It So"] = {
    Cost = 0,
    Color = "Regent",
    Image = "StS2_Regent-MakeItSo.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [6|9] damage.<br>Every 3 Skills you play in a turn, put this into your Hand."
  },
  ["Monarch's Gaze"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Regent",
    Image = "StS2_Regent-MonarchsGaze.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Whenever you attack an enemy, it loses 1 $Strength this turn."
  },
  ["Neutron Aegis"] = {
    Cost = 1,
    StarCost = 5,
    Color = "Regent",
    Image = "StS2_Regent-NeutronAegis.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Gain [8|11] $Plating."
  },
  ["Royalties"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Royalties.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "At the end of combat, gain [30|40] @Gold."
  },
  ["Seeking Edge"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-SeekingEdge.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "$Forge [7|11].<br>{{C2|Sovereign Blade}} now deals damage to ALL enemies."
  },
  ["Seven Stars"] = {
    Cost = 2,
    CostPlus = 1,
    StarCost = 7,
    Color = "Regent",
    Image = "StS2_Regent-SevenStars.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal 7 damage to ALL enemies 7 times."
  },
  ["Sword Sage"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Regent",
    Image = "StS2_Regent-SwordSage.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "{{C2|Sovereign Blade}} gains $Replay 1."
  },
  ["The Smith"] = {
    Cost = 1,
    StarCost = 4,
    Color = "Regent",
    Image = "StS2_Regent-TheSmith.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "$Forge [30|40]."
  },
  ["Tutor"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Regent",
    Image = "StS2_Regent-Tutor.png",
    Type = "Skill",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "Another player chooses a card in their Draw Pile to add into their Hand."
  },
  ["Tyranny"] = {
    Cost = 1,
    Color = "Regent",
    Image = "StS2_Regent-Tyranny.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "[|$Innate.<br>]At the start of your turn, draw 1 card and $Exhaust 1 card from your Hand."
  },
  ["Void Form"] = {
    Cost = 3,
    Color = "Regent",
    Image = "StS2_Regent-VoidForm.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "[$Ethereal.<br>|]End your turn.<br>The first 2 cards you play each turn are free to play."
  },
  ["Meteor Shower"] = {
    Cost = 0,
    StarCost = 2,
    Color = "Regent",
    Image = "StS2_Regent-MeteorShower.png",
    Type = "Attack",
    Rarity = "Ancient",
    Text = "Deal [14|21] damage to ALL enemies.<br>Apply 2 $Weak and $Vulnerable to ALL enemies."
  },
  ["The Sealed Throne"] = {
    Cost = 1,
    CostPlus = 0,
    StarCost = 3,
    Color = "Regent",
    Image = "StS2_Regent-TheSealedThrone.png",
    Type = "Power",
    Rarity = "Ancient",
    Text = "Whenever you play a card, gain @ST."
  }
}

local formatted = {}
for name, card in pairs(all_data) do
	card.EditLink = "Module:Cards/StS2_data/Regent"
	formatted[name] = card
end

return formatted