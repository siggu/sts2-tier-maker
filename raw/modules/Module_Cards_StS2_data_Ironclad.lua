local all_data = {
  ["Strike (Ironclad)"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Strike.png",
    Type = "Attack",
    Rarity = "Basic",
    Text = "Deal [6|9] damage."
  },
  ["Defend (Ironclad)"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Defend.png",
    Type = "Skill",
    Rarity = "Basic",
    Text = "Gain [5|8] $Block."
  },
  ["Bash"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Bash.png",
    Type = "Attack",
    Rarity = "Basic",
    Text = "Deal [8|10] damage.<br>Apply [2|3] $Vulnerable."
  },
  ["Anger"] = {
    Cost = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Anger.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [6|8] damage.<br>Add a copy of this card into your Discard Pile."
  },
  ["Armaments"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Armaments.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain 5 $Block.<br>Upgrade [a card|ALL cards] in your Hand."
  },
  ["Blood Wall"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-BloodWall.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Lose 2 HP.<br>Gain [16|20] $Block."
  },
  ["Bloodletting"] = {
    Cost = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Bloodletting.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Lose 3 HP.<br>Gain [@IE@IE|@IE@IE@IE]."
  },
  ["Body Slam"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-BodySlam.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal damage equal to your $Block."
  },
  ["Breakthrough"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Breakthrough.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Lose 1 HP.<br>Deal [9|13] damage to ALL enemies."
  },
  ["Cinder"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Cinder.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [18|24] damage.<br>$Exhaust a random card in your Hand."
  },
  ["Havoc"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Havoc.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Play the top card of your Draw Pile and $Exhaust it."
  },
  ["Headbutt"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Headbutt.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [9|12] damage.<br>Put a card from your Discard Pile on top of your Draw Pile."
  },
  ["Iron Wave"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-IronWave.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Gain [5|7] $Block.<br>Deal [5|7] damage."
  },
  ["Molten Fist"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-MoltenFist.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [10|14] damage.<br>Double the enemy's $Vulnerable.<br>$Exhaust."
  },
  ["Perfected Strike"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-PerfectedStrike.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal 6 damage.<br>Deals [2|3] additional damage for ALL your cards containing “Strike”."
  },
  ["Pommel Strike"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-PommelStrike.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [9|10] damage.<br>Draw [1 card|2 cards]."
  },
  ["Setup Strike"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-SetupStrike.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [7|9] damage.<br>Gain [3|4] $Strength this turn."
  },
  ["Shrug It Off"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-ShrugItOff.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [8|11] $Block.<br>Draw 1 card."
  },
  ["Sword Boomerang"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-SwordBoomerang.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal 3 damage to a random enemy [3|4] times."
  },
  ["Thunderclap"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Thunderclap.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [4|7] damage and apply 1 $Vulnerable to ALL enemies."
  },
  ["Tremble"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Tremble.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Apply [3|4] $Vulnerable.<br>$Exhaust."
  },
  ["True Grit"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-TrueGrit.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [7|9] $Block.<br>$Exhaust 1 card[ at random|]."
  },
  ["Twin Strike"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-TwinStrike.png",
    Type = "Attack",
    Rarity = "Common",
    Text = "Deal [5|7] damage twice."
  },
  ["Ashen Strike"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-AshenStrike.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal 6 damage.<br>Deals [3|4] additional damage for each card in your Exhaust Pile."
  },
  ["Battle Trance"] = {
    Cost = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-BattleTrance.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Draw [3|4] cards.<br>You cannot draw additional cards this turn."
  },
  ["Blaze"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Blaze.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Give another player [5|7] $Strength."
  },
  ["Bludgeon"] = {
    Cost = 3,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Bludgeon.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [32|42] damage."
  },
  ["Bully"] = {
    Cost = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Bully.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal 4 damage.<br>Deals [2|3] additional damage for each $Vulnerable on the enemy."
  },
  ["Burning Pact"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-BurningPact.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Exhaust 1 card.<br>Draw [2|3] cards."
  },
  ["Colossus"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Colossus.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [4|7] $Block.<br>You receive 50% less damage from $Vulnerable enemies this turn."
  },
  ["Demonic Shield"] = {
    Cost = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-DemonicShield.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Lose 1 HP.<br>Give another player $Block equal to your $Block.[<br>$Exhaust.|]"
  },
  ["Dismantle"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Dismantle.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [8|10] damage.<br>If the enemy is $Vulnerable, hits twice."
  },
  ["Dominate"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Dominate.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Apply [1|2] $Vulnerable.<br> Gain 1 $Strength for each $Vulnerable on the enemy.<br>$Exhaust."
  },
  ["Drum of Battle"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-DrumofBattle.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Draw 2 cards.<br>When this card is <br>$Exhausted, gain [@IE@IE|@IE@IE@IE]"
  },
  ["Evil Eye"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-EvilEye.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [8|11] $Block.<br>Gain another [8|11] $Block if you have $Exhausted a card this turn."
  },
  ["Expect a Fight"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-ExpectaFight.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain 1 Energy for each Attack in your Hand. You cannot gain additional Energy this turn"
  },
  ["Feel No Pain"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-FeelNoPain.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever a card is $Exhausted, gain [3|4] $Block."
  },
  ["Fight Me!"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-FightMe.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [5|6] damage twice.<br>Gain [3|4] $Strength.<br>The enemy gains 1 $Strength."
  },
  ["Flame Barrier"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-FlameBarrier.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [12|16] $Block.<br>Whenever you are attacked this turn, deal [4|6] damage back."
  },
  ["Forgotten Ritual"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-ForgottenRitual.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [@IE@IE@IE|4 @IE]. <br>$Exhaust."
  },
  ["Hemokinesis"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Hemokinesis.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Lose 2 HP.<br>Deal [15|20] damage."
  },
  ["Howl from Beyond"] = {
    Cost = 3,
    Color = "Ironclad",
    Image = "StS2_Ironclad-HowlfromBeyond.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [18|24] damage to ALL enemies.<br>At the end of your turn, if this is in your $Exhaust Pile, play it."
  },
  ["Infernal Blade"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-InfernalBlade.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Add a random Attack into your Hand. It's free to play this turn.<br>$Exhaust."
  },
  ["Inferno"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Inferno.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "At the start of your turn, lose 1 HP.<br>Whenever you lose HP on your turn, deal [6|9] damage to ALL enemies."
  },
  ["Inflame"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Inflame.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Gain [2|3] $Strength."
  },
  ["Juggling"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Juggling.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "[|$Innate.<br>]Add a copy of the third Attack you play each turn into your Hand."
  },
  ["Pillage"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Pillage.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [6|9] damage.<br>Draw cards until you draw a non-Attack card."
  },
  ["Rage"] = {
    Cost = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Rage.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Whenever you play an Attack this turn, gain [3|5] $Block."
  },
  ["Outrage"] = {
    Cost = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Outrage.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Deal [9|13] damage. Add a copy of this card into EVERYONE'S Discard Pile."
  },
  ["Rampage"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Rampage.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal 10 damage.<br>Increase this card's damage by [5|10] this combat."
  },
  ["Rupture"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Rupture.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you lose HP on your turn, gain [1|2] $Strength."
  },
  ["Second Wind"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-SecondWind.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Exhaust all non-Attack cards in your Hand. Gain [5|7] $Block for each card $Exhausted."
  },
  ["Spite"] = {
    Cost = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Spite.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal 5 damage. If you lost HP this turn, hits [2|3] times."
  },
  ["Stampede"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Stampede.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "At the end of your turn, 1 random Attack in your Hand is played against a random enemy."
  },
  ["Stomp"] = {
    Cost = 3,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Stomp.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [12|15] damage to ALL enemies.<br>Costs 1 less @IE for each Attack played this turn."
  },
  ["Stone Armor"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-StoneArmor.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Gain [4|6] $Plating."
  },
  ["Taunt"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Taunt.png",
    Type = "Skill",
    Rarity = "Common",
    Text = "Gain [6|7] $Block.<br>Apply [1|2] $Vulnerable."
  },
  ["Unrelenting"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Unrelenting.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [14|20] damage.<br>The next Attack you play costs 0 @IE."
  },
  ["Uppercut"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Uppercut.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal 13 damage.<br>Apply [1|2] $Weak.<br>Apply [1|2] $Vulnerable."
  },
  ["Vicious"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Vicious.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you apply $Vulnerable, draw [1 card|2 cards]."
  },
  ["Whirlwind"] = {
    Cost = -1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Whirlwind.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [5|8] damage to ALL enemies X times."
  },
  ["Aggression"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Aggression.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "[|$Innate.<br>]At the start of your turn, put a random Attack from your Discard Pile into your Hand and Upgrade it."
  },
  ["Barricade"] = {
    Cost = 3,
    CostPlus = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Barricade.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "$Block is not removed at the start of your turn."
  },
  ["Brand"] = {
    Cost = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Brand.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Lose 1 HP.<br>$Exhaust 1 card.<br>Gain [1|2] $Strength."
  },
  ["Cascade"] = {
    Cost = -1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Cascade.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Play the top [X|X+1] cards of your Draw Pile."
  },
  ["Conflagration"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Conflagration.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal 2 damage to ALL enemies [4|5] times."
  },
  ["Crimson Mantle"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-CrimsonMantle.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "At the start of your turn, lose 1 HP and gain [7|10] $Block."
  },
  ["Cruelty"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Cruelty.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "$Vulnerable enemies take an additional [25%|50%] damage."
  },
  ["Dark Embrace"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-DarkEmbrace.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Whenever a card is $Exhausted,<br>draw 1 card."
  },
  ["Demon Form"] = {
    Cost = 3,
    Color = "Ironclad",
    Image = "StS2_Ironclad-DemonForm.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "At the start of your turn, gain [3|4] $Strength."
  },
  ["Feed"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Feed.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [10|12] damage.<br>If $Fatal, raise your Max HP by [3|4].<br>$Exhaust."
  },
  ["Fiend Fire"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-FiendFire.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "$Exhaust your Hand.<br>Deal [7|10] damage for each card $Exhausted.<br>$Exhaust."
  },
  ["Hellraiser"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Hellraiser.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Whenever you draw a card containing “Strike”, it is played against a random enemy."
  },
  ["Impervious"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Impervious.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Gain [30|40] $Block.<br>$Exhaust."
  },
  ["Juggernaut"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Juggernaut.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Whenever you gain $Block, deal [5|7] damage to a random enemy."
  },
  ["Mangle"] = {
    Cost = 3,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Mangle.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [20|26] damage.<br>Enemy loses [10|15] $Strength this turn."
  },
  ["Midnight"] = {
    Cost = 12,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Midnight.png",
    Type = "Attack",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "Deal [60|72] damage.<br>Costs @IE less for each card $Exhausted this combat by ANYONE."
  },
  ["Not Yet"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-NotYet.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Heal [10|13] HP. <br> $Exhaust."
  },
  ["Offering"] = {
    Cost = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Offering.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Lose 6 HP.<br>Gain @IE@IE.<br>Draw [3|5] cards.<br>$Exhaust."
  },
  ["One-Two Punch"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-One-TwoPunch.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "This turn, your next [Attack is|2 Attacks are] played an extra time."
  },
  ["Pact's End"] = {
    Cost = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-PactsEnd.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "If you have 3 or more cards in your $Exhaust Pile,<br>deal [18|24] damage to ALL enemies."
  },
  ["Primal Force"] = {
    Cost = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-PrimalForce.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Transform all Attacks in your Hand into {{C2|Giant Rock}}[|+]."
  },
  ["Pyre"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Pyre.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Gain [@IE|@IE@IE] at the start of each turn."
  },
  ["Stoke"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Stoke.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "$Exhaust your Hand.<br>Add 1 random [|$Upgraded] card into your Hand for each card $Exhausted."
  },
  ["Tank"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Tank.png",
    Type = "Power",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "Take 50% additional damage from enemies.<br>Allies take 50% less damage from enemies."
  },
  ["Tear Asunder"] = {
    Cost = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-TearAsunder.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [5|7] damage.<br>Hits an additional time for each time you lost HP this combat."
  },
  ["Thrash"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Thrash.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [4|6] damage twice.<br>$Exhaust a random Attack in your Hand and add its damage to this card."
  },
  ["Unmovable"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Unmovable.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "The first time you gain $Block from a card each turn, double the amount gained."
  },
  ["Break"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Break.png",
    Type = "Attack",
    Rarity = "Ancient",
    Text = "Deal [20|30] damage.<br>Apply [5|7] $Vulnerable."
  },
  ["Corruption"] = {
    Cost = 3,
    CostPlus = 2,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Corruption.png",
    Type = "Power",
    Rarity = "Ancient",
    Text = "Skills cost 0 @IE.<br>Whenever you play a Skill, $Exhaust it."
  },
  ["Grapple"] = {
    Cost = 1,
    Color = "Ironclad",
    Image = "StS2_Ironclad-Grapple.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [7|9] damage.<br>Whenever you gain $Block this turn, deal [5|7] damage to the enemy.",
    Traits = { NoList = true }
  }
}

local formatted = {}
for name, card in pairs(all_data) do
	card.EditLink = "Module:Cards/StS2_data/Ironclad"
	formatted[name] = card
end

return formatted