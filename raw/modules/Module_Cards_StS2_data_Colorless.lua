local all_data = {
  ["Automation"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Automation.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Every 10 cards you draw, gain @CE."
  },
  ["Believe in You"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-BelieveinYou.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Another player gains @CE@CE[|@CE]."
  },
  ["Catastrophe"] = {
    Cost = 2,
    Color = "Colorless",
    Image = "StS2_Colorless-Catastrophe.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Play [2|3] random cards from your Draw Pile."
  },
  ["Coordinate"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Coordinate.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Give another player [5|8] $Strength this turn."
  },
  ["Dark Shackles"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-DarkShackles.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Enemy loses [9|15] $Strength this turn.<br>$Exhaust."
  },
  ["Discovery"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Discovery.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Choose 1 of 3 random cards to add into your Hand. It's free to play this turn.[<br>$Exhaust.|]"
  },
  ["Dramatic Entrance"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-DramaticEntrance.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "$Innate.<br>Deal [11|15] damage to ALL enemies.<br>$Exhaust."
  },
  ["Equilibrium"] = {
    Cost = 2,
    Color = "Colorless",
    Image = "StS2_Colorless-Equilibrium.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [13|16] $Block.<br>$Retain your Hand this turn."
  },
  ["Fasten"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Fasten.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Gain an additional [4|6] $Block from Defend cards."
  },
  ["Finesse"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Finesse.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [4|7] $Block.<br>Draw 1 card."
  },
  ["Fisticuffs"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Fisticuffs.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [7|9] damage.<br>Gain $Block equal to damage dealt."
  },
  ["Flash of Steel"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-FlashofSteel.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [5|8] damage.<br>Draw 1 card."
  },
  ["Gang Up"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-GangUp.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Deal 5 damage.<br>Deals [5|7] additional damage for each time another player has attacked the enemy this turn."
  },
  ["Huddle Up"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-HuddleUp.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "ALL players draw [2|3] cards.<br>$Exhaust."
  },
  ["Impatience"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Impatience.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "If you have no Attacks in your Hand, draw [2|3] cards."
  },
  ["Intercept"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Intercept.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Gain [9|13] $Block.<br>Redirect all incoming attacks that would be dealt to another player this turn to you."
  },
  ["Jack of All Trades"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-JackofAllTrades.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Add [1|2] random Colorless [card|cards] into your Hand.<br>$Exhaust."
  },
  ["Lift"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Lift.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Give another player [11|16] $Block."
  },
  ["Mind Blast"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-MindBlast.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "$Innate.<br>Deal damage equal to the number of cards in your Draw Pile."
  },
  ["Omnislice"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Omnislice.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [8|11] damage.<br>Damage ALL other enemies equal to the damage dealt."
  },
  ["Panache"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Panache.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Every time you play 5 cards in a single turn, deal [10|14] damage to ALL enemies."
  },
  ["Panic Button"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-PanicButton.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [30|40] $Block.<br>You cannot gain $Block from cards for 2 turns.<br>$Exhaust."
  },
  ["Prep Time"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-PrepTime.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "At the start of your turn, gain [4|6] $Vigor."
  },
  ["Production"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Production.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain @CE@CE[|@CE].<br>$Exhaust."
  },
  ["Prolong"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Prolong.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Next turn, gain $Block equal to your current $Block.[<br>$Exhaust.|]"
  },
  ["Prowess"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Prowess.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Gain [1|2] $Strength.<br>Gain [1|2] $Dexterity."
  },
  ["Purity"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Purity.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Retain.<br>$Exhaust up to [3|5] cards in your Hand.<br>$Exhaust."
  },
  ["Restlessness"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Restlessness.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "$Retain.<br>If your Hand is empty, draw [2|3] cards and gain [@CE@CE|@CE@CE@CE]."
  },
  ["Seeker Strike"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-SeekerStrike.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [9|12] damage.<br>Choose 1 of 3 cards in your Draw Pile to add into your Hand."
  },
  ["Shockwave"] = {
    Cost = 2,
    Color = "Colorless",
    Image = "StS2_Colorless-Shockwave.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Apply [3|5] $Weak and $Vulnerable to ALL enemies.<br>$Exhaust."
  },
  ["Splash"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Splash.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Choose 1 of 3 random[| $Upgraded] Attacks from another character to add into your Hand. It's free to play this turn."
  },
  ["Stratagem"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Stratagem.png",
    Type = "Power",
    Rarity = "Uncommon",
    Text = "Whenever you shuffle your Draw Pile, choose a card from it to put into your Hand."
  },
  ["Tag Team"] = {
    Cost = 2,
    Color = "Colorless",
    Image = "StS2_Colorless-TagTeam.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Deal [11|15] damage.<br>The next Attack another player plays on the enemy is played an extra time."
  },
  ["The Ball"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-TheBall.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Multiplayer = true,
    Text = "Deal 10 damage.<br>Increase this card's damage by [10|15] this combat and give it to a random ally."
  },
  ["The Bomb"] = {
    Cost = 2,
    Color = "Colorless",
    Image = "StS2_Colorless-TheBomb.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "At the end of 3 turns, deal [40|50] damage to ALL enemies."
  },
  ["Thinking Ahead"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-ThinkingAhead.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Draw 2 cards.<br>Put 1 card from your Hand on top of your Draw Pile.[<br>$Exhaust.|]"
  },
  ["Thrumming Hatchet"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-ThrummingHatchet.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [11|14] damage.<br>At the start of your next turn, return this to your Hand."
  },
  ["Ultimate Defend"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-UltimateDefend.png",
    Type = "Skill",
    Rarity = "Uncommon",
    Text = "Gain [11|15] $Block."
  },
  ["Ultimate Strike"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-UltimateStrike.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [14|20] damage."
  },
  ["Volley"] = {
    Cost = -1,
    Color = "Colorless",
    Image = "StS2_Colorless-Volley.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [10|14] damage to a random enemy X times."
  },
  ["Alchemize"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Alchemize.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Procure a random potion.<br>$Exhaust."
  },
  ["Anointed"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Anointed.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "[|$Retain.<br>]Put every Rare card from your Draw Pile into your Hand.<br>$Exhaust."
  },
  ["Beacon of Hope"] = {
    Cost = 2,
    Color = "Colorless",
    Image = "StS2_Colorless-BeaconofHope.png",
    Type = "Power",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "[|$Innate.<br>]Whenever you gain $Block on your turn, other players gain half that much $Block."
  },
  ["Beat Down"] = {
    Cost = 3,
    Color = "Colorless",
    Image = "StS2_Colorless-BeatDown.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Play [3|4] random Attacks from your Discard Pile."
  },
  ["Bolas"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Bolas.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [3|4] damage.<br>At the start of your next turn, return this to your Hand."
  },
  ["Calamity"] = {
    Cost = 3,
    CostPlus = 2,
    Color = "Colorless",
    Image = "StS2_Colorless-Calamity.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Whenever you play an Attack, add a random Attack into your Hand."
  },
  ["Entropy"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Entropy.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "[|$Innate.<br>]At the start of your turn, $Transform 1 card in your Hand."
  },
  ["Eternal Armor"] = {
    Cost = 3,
    Color = "Colorless",
    Image = "StS2_Colorless-EternalArmor.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "Gain [9|12] $Plating."
  },
  ["Gold Axe"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-GoldAxe.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "[|$Retain.<br>]Deal damage equal to the number of cards played this combat."
  },
  ["Hand of Greed"] = {
    Cost = 2,
    Color = "Colorless",
    Image = "StS2_Colorless-HandofGreed.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [20|25] damage.<br>If Fatal, gain [20|25] @Gold."
  },
  ["Hidden Gem"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-HiddenGem.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "A random card in your Draw Pile without $Replay gains $Replay [2|3]."
  },
  ["Jackpot"] = {
    Cost = 3,
    Color = "Colorless",
    Image = "StS2_Colorless-Jackpot.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [25|30] damage.<br>Add 3 random[| $Upgraded] 0 @CE cards into your Hand."
  },
  ["Knockdown"] = {
    Cost = 3,
    Color = "Colorless",
    Image = "StS2_Colorless-Knockdown.png",
    Type = "Attack",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "Deal [10|14] damage.<br>The enemy takes [double|triple] damage from other players this turn."
  },
  ["Master of Strategy"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-MasterofStrategy.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Draw [3|4] cards.<br>$Exhaust."
  },
  ["Mayhem"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Mayhem.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "At the start of your turn, play the top card of your Draw Pile."
  },
  ["Mimic"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Mimic.png",
    Type = "Skill",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "Gain $Block equal to the $Block on another player.[<br>$Exhaust.|]"
  },
  ["Nostalgia"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Nostalgia.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "The first Attack or Skill you play each turn is placed on top of your Draw Pile."
  },
  ["Rally"] = {
    Cost = 2,
    Color = "Colorless",
    Image = "StS2_Colorless-Rally.png",
    Type = "Skill",
    Rarity = "Rare",
    Multiplayer = true,
    Text = "ALL players gain [12|17] $Block."
  },
  ["Rend"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Rend.png",
    Type = "Attack",
    Rarity = "Rare",
    Text = "Deal [10|12] damage.<br>Deals [5|8] additional damage for each unique debuff on the enemy."
  },
  ["Rolling Boulder"] = {
    Cost = 3,
    Color = "Colorless",
    Image = "StS2_Colorless-RollingBoulder.png",
    Type = "Power",
    Rarity = "Rare",
    Text = "At the start of your turn, deal [5|10] damage to ALL enemies and increase this damage by 5."
  },
  ["Salvo"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Salvo.png",
    Type = "Attack",
    Rarity = "Uncommon",
    Text = "Deal [12|16] damage.<br>$Retain your Hand this turn."
  },
  ["Scrawl"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Scrawl.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "[|$Retain.<br>]Draw cards until your Hand is full.<br>$Exhaust."
  },
  ["Secret Technique"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-SecretTechnique.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Put a Skill from your Draw Pile into your Hand.[<br>$Exhaust.|]"
  },
  ["Secret Weapon"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-SecretWeapon.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Put an Attack from your Draw Pile into your Hand.[<br>$Exhaust.|]"
  },
  ["The Gambit"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-TheGambit.png",
    Type = "Skill",
    Rarity = "Rare",
    Text = "Gain [50|75] $Block.<br>If you take unblocked attack damage this combat, die."
  },
  ["Apotheosis"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Apotheosis.png",
    Type = "Skill",
    Rarity = "Ancient",
    Text = "$Innate.<br>$Upgrade ALL your cards.<br>$Exhaust."
  },
  ["Apparition"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Apparition.png",
    Type = "Skill",
    Rarity = "Ancient",
    Text = "[$Ethereal. <br>|] Gain 1 $Intangible.<br>$Exhaust."
  },
  ["Brightest Flame"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-BrightestFlame.png",
    Type = "Skill",
    Rarity = "Ancient",
    Text = "Gain [@CE@CE|@CE@CE@CE].<br>Draw [2|3] cards.<br>Lose 1 Max HP."
  },
  ["Maul"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Maul.png",
    Type = "Attack",
    Rarity = "Ancient",
    Text = "Deal [5|6] damage twice.<br>Increase the damage of ALL Maul cards by [2|3] this combat."
  },
  ["Neow's Fury"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-NeowsFury.png",
    Type = "Attack",
    Rarity = "Ancient",
    Text = "Deal [10|14] damage.<br>Put up to [2|3] cards from your Discard Pile into your Hand.<br>$Exhaust."
  },
  ["Abundance"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Abundance.png",
    Type = "Skill",
    Rarity = "Ancient",
    Text = "Choose 1 of 3 Powers to add into your Hand. It's free to play this turn.<br>$Exhaust."
  },
  ["Relax"] = {
    Cost = 3,
    Color = "Colorless",
    Image = "StS2_Colorless-Relax.png",
    Type = "Skill",
    Rarity = "Ancient",
    Text = "Gain [16|18] $Block.<br>Next turn, draw [2|3] cards and gain [@CE@CE|@CE@CE@CE].<br>$Exhaust."
  },
  ["Whistle"] = {
    Cost = 2,
    Color = "Colorless",
    Image = "StS2_Colorless-Whistle.png",
    Type = "Attack",
    Rarity = "Ancient",
    Text = "Deal [33|44] damage.<br>$Stun the enemy.<br>$Exhaust."
  },
  ["Wish"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Wish.png",
    Type = "Skill",
    Rarity = "Ancient",
    Text = "[|$Retain.<br>]Put a card from your Draw Pile into your Hand.<br>$Exhaust."
  },
  ["Beckon"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Beckon.png",
    Type = "Status",
    Rarity = "Status",
    Text = "At the end of your turn, if this is in your Hand,<br> lose 6 HP.",
    NoUpgrade = true
  },
  ["Burn"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Colorless-Burn.png",
    Type = "Status",
    Rarity = "Status",
    Text = "$Unplayable.<br>At the end of your turn, if this is in your Hand, take 2 damage.",
    NoUpgrade = true
  },
  ["Dazed"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Colorless-Dazed.png",
    Type = "Status",
    Rarity = "Status",
    Text = "$Unplayable.<br>$Ethereal.",
    NoUpgrade = true
  },
  ["Debris"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Debris.png",
    Type = "Status",
    Rarity = "Status",
    Text = "$Exhaust.",
    NoUpgrade = true
  },
  ["Disintegration"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Colorless-Disintegration.png",
    Type = "Status",
    Rarity = "Status",
    Text = "At the end of your turn, take 6/7/8 damage.",
    NoUpgrade = true
  },
  ["Frantic Escape"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-FranticEscape.png",
    Type = "Status",
    Rarity = "Status",
    Text = "Get farther away.<br>Increase $Sandpit by 1.<br>Increase the cost of this card by 1.",
    NoUpgrade = true
  },
  ["Infection"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Colorless-Infection.png",
    Type = "Status",
    Rarity = "Status",
    Text = "$Unplayable.<br>At the end of your turn, if this is in your Hand, take 3 damage.",
    NoUpgrade = true
  },
  ["Mind Rot"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Colorless-MindRot.png",
    Type = "Status",
    Rarity = "Status",
    Text = "Draw 1 fewer card each turn.",
    NoUpgrade = true
  },
  ["Slimed"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Slimed.png",
    Type = "Status",
    Rarity = "Status",
    Text = "Draw 1 card.<br>$Exhaust.",
    NoUpgrade = true
  },
  ["Sloth"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Colorless-Sloth.png",
    Type = "Status",
    Rarity = "Status",
    Text = "You cannot play more than 3 cards each turn.",
    NoUpgrade = true
  },
  ["Soot"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Colorless-Soot.png",
    Type = "Status",
    Rarity = "Status",
    Text = "$Unplayable.",
    NoUpgrade = true
  },
  ["Toxic"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Toxic.png",
    Type = "Status",
    Rarity = "Status",
    Text = "At the end of your turn, if this is in your Hand, take 5 damage.<br>$Exhaust.",
    NoUpgrade = true
  },
  ["Void"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Colorless-Void.png",
    Type = "Status",
    Rarity = "Status",
    Text = "$Unplayable.<br>$Ethereal.<br>Whenever you draw this card, lose @CE.",
    NoUpgrade = true
  },
  ["Waste Away"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Colorless-WasteAway.png",
    Type = "Status",
    Rarity = "Status",
    Text = "Gain 1 less @CE per turn.",
    NoUpgrade = true
  },
  ["Wound"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Colorless-Wound.png",
    Type = "Status",
    Rarity = "Status",
    Text = "$Unplayable.",
    NoUpgrade = true
  },
  ["Ascender's Bane"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-AscendersBane.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>$Ethereal.<br>$Eternal.",
    NoUpgrade = true
  },
  ["Bad Luck"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-BadLuck.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>At the end of your turn, if this is in your Hand, lose 13 HP.<br>$Eternal.",
    NoUpgrade = true
  },
  ["Clumsy"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-Clumsy.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>$Ethereal.",
    NoUpgrade = true
  },
  ["Curse of the Bell"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-CurseoftheBell.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>$Eternal.",
    NoUpgrade = true
  },
  ["Debt"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-Debt.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>At the end of your turn, if this is in your Hand, lose 10 @Gold.",
    NoUpgrade = true
  },
  ["Decay"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-Decay.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>At the end of your turn, if this is in your Hand, take 2 damage.",
    NoUpgrade = true
  },
  ["Doubt"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-Doubt.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>At the end of your turn, if this is in your Hand, gain 1 $Weak.",
    NoUpgrade = true
  },
  ["Enthralled"] = {
    Cost = 2,
    Color = "Colorless",
    Image = "StS2_Curse-Enthralled.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "If this is in your Hand, it must be played before other cards.<br>$Eternal.",
    NoUpgrade = true
  },
  ["Folly"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-Folly.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>$Ethereal.<br>$Innate.<br>$Eternal.",
    NoUpgrade = true
  },
  ["Greed"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-Greed.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>$Eternal.",
    NoUpgrade = true
  },
  ["Guilty"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-Guilty.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>Removed from your Deck after 5 combats.",
    NoUpgrade = true
  },
  ["Injury"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-Injury.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.",
    NoUpgrade = true
  },
  ["Normality"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-Normality.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>You cannot play more than 3 cards this turn.",
    NoUpgrade = true
  },
  ["Poor Sleep"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-PoorSleep.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>$Retain.",
    NoUpgrade = true
  },
  ["Regret"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-Regret.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>At the end of your turn, if this is in your Hand, lose 1 HP for each card in your Hand.",
    NoUpgrade = true
  },
  ["Shame"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-Shame.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>At the end of your turn, if this is in your Hand, gain 1 $Frail.",
    NoUpgrade = true
  },
  ["Spore Mind"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Curse-SporeMind.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Exhaust.",
    NoUpgrade = true
  },
  ["Writhe"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Curse-Writhe.png",
    Type = "Curse",
    Rarity = "Curse",
    Text = "$Unplayable.<br>$Innate.",
    NoUpgrade = true
  },
  ["Byrd Swoop"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-ByrdSwoop.png",
    Type = "Attack",
    Rarity = "Event",
    Text = "Deal [14|18] damage."
  },
  ["Enlightenment"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Enlightenment.png",
    Type = "Skill",
    Rarity = "Event",
    Text = "Reduce the cost of ALL cards in your Hand to 1 this [turn|combat].<br>$Exhaust."
  },
  ["Exterminate"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Exterminate.png",
    Type = "Attack",
    Rarity = "Event",
    Text = "Deal [3|4] damage to ALL enemies 4 times."
  },
  ["Feeding Frenzy"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-FeedingFrenzy.png",
    Type = "Skill",
    Rarity = "Event",
    Text = "Gain [5|7] $Strength this turn."
  },
  ["Metamorphosis"] = {
    Cost = 2,
    Color = "Colorless",
    Image = "StS2_Colorless-Metamorphosis.png",
    Type = "Skill",
    Rarity = "Event",
    Text = "Add [3|5] random Attacks into your Draw Pile. They're free to play this combat.<br>$Exhaust."
  },
  ["Mad Science"] = {
  	Cost = 1,
  	Color = "Colorless",
  	Image = "StS2_Colorless-MadScience.gif",
  	Type = "Skill", -- Generic tag
  	Rarity = "Event",
  	Text = "[|$Innate<br>]This card can be created and customized at the event {{2|Tinker Time}}."
  },
  ["Mad Science (Sapping)"] = {
  	Cost = 1,
  	Color = "Colorless",
  	Image = "StS2_Colorless-MadScience-Sapping.png",
  	Type = "Attack",
  	Rarity = "Event",
  	Text = "[|$Innate<br>]Deal 12 damage.<br>Apply 2 $Weak.<br>Apply 2 $Vulnerable.",
  	Link = "Mad_Science#Sapping-0",
  	Traits = { NoList = true }
  },
  ["Mad Science (Violence)"] = {
  	Cost = 1,
  	Color = "Colorless",
  	Image = "StS2_Colorless-MadScience-Violence.png",
  	Type = "Attack",
  	Rarity = "Event",
  	Text = "[|$Innate<br>]Deal 12 damage 3 times.",
  	Link = "Mad_Science#Violence-0",
  	Traits = { NoList = true }
  },
  ["Mad Science (Choking)"] = {
  	Cost = 1,
  	Color = "Colorless",
  	Image = "StS2_Colorless-MadScience-Choking.png",
  	Type = "Attack",
  	Rarity = "Event",
  	Text = "[|$Innate<br>]Deal 12 damage.<br>Whenever you play a card this turn, the enemy loses 6 HP.",
  	Link = "Mad_Science#Choking-0",
  	Traits = { NoList = true }
  },
  ["Mad Science (Energized)"] = {
  	Cost = 1,
  	Color = "Colorless",
  	Image = "StS2_Colorless-MadScience-Energized.png",
  	Type = "Skill",
  	Rarity = "Event",
  	Text = "[|$Innate<br>]Gain 8 $Block.<br>Gain @CE @CE.",
  	Link = "Mad_Science#Energized-0",
  	Traits = { NoList = true }
  },
  ["Mad Science (Wisdom)"] = {
  	Cost = 1,
  	Color = "Colorless",
  	Image = "StS2_Colorless-MadScience-Wisdom.png",
  	Type = "Skill",
  	Rarity = "Event",
  	Text = "[|$Innate<br>]Gain 8 $Block.<br>Draw 3 cards.",
  	Link = "Mad_Science#Wisdom-0",
  	Traits = { NoList = true }
  },
  ["Mad Science (Chaos)"] = {
  	Cost = 1,
  	Color = "Colorless",
  	Image = "StS2_Colorless-MadScience-Chaos.png",
  	Type = "Skill",
  	Rarity = "Event",
  	Text = "[|$Innate<br>]Gain 8 $Block.<br>Add a random card into your Hand. It's free to play this turn.",
  	Link = "Mad_Science#Chaos-0",
  	Traits = { NoList = true }
  },
  ["Mad Science (Expertise)"] = {
  	Cost = 1,
  	Color = "Colorless",
  	Image = "StS2_Colorless-MadScience-Expertise.png",
  	Type = "Power",
  	Rarity = "Event",
  	Text = "[|$Innate<br>]Gain 2 $Strength.<br>Gain 2 $Dexterity.",
  	Link = "Mad_Science#Expertise-0",
  	Traits = { NoList = true }
  },
  ["Mad Science (Improvement)"] = {
  	Cost = 1,
  	Color = "Colorless",
  	Image = "StS2_Colorless-MadScience-Improvement.png",
  	Type = "Power",
  	Rarity = "Event",
  	Text = "[|$Innate<br>]At the end of combat, $Upgrade a random card.",
  	Link = "Mad_Science#Improvement-0",
  	Traits = { NoList = true }
  },
  ["Mad Science (Curious)"] = {
  	Cost = 1,
  	Color = "Colorless",
  	Image = "StS2_Colorless-MadScience-Curious.png",
  	Type = "Power",
  	Rarity = "Event",
  	Text = "[|$Innate<br>]Powers cost 1 @CE less.",
  	Link = "Mad_Science#Curious-0",
  	Traits = { NoList = true }
  },
  ["Peck"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Peck.png",
    Type = "Attack",
    Rarity = "Event",
    Text = "Deal 2 damage [3|4] times."
  },
  ["Squash"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-Squash.png",
    Type = "Attack",
    Rarity = "Event",
    Text = "Deal [10|12] damage.<br>Apply [2|3] $Vulnerable."
  },
  ["Toric Toughness"] = {
    Cost = 2,
    Color = "Colorless",
    Image = "StS2_Colorless-ToricToughness.png",
    Type = "Skill",
    Rarity = "Event",
    Text = "Gain [5|7] $Block.<br>Gain [5|7] $Block at the start of the next 2 turns."
  },
  ["Byrdonis Egg"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Quest-ByrdonisEgg.png",
    Type = "Quest",
    Rarity = "Quest",
    Text = "$Unplayable.<br>Can be hatched at a Rest Site.",
    NoUpgrade = true
  },
  ["Lantern Key"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Quest-LanternKey.png",
    Type = "Quest",
    Rarity = "Quest",
    Text = "$Unplayable.<br>Unlocks a special event in the next Act.",
    NoUpgrade = true
  },
  ["Spoils Map"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Quest-SpoilsMap.png",
    Type = "Quest",
    Rarity = "Quest",
    Text = "$Unplayable.<br>Marks a site of 600 extra @Gold in the next Act.",
    NoUpgrade = true
  },
  ["Dowsing"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Quest-Dowsing.png",
    Type = "Quest",
    Rarity = "Quest",
    Text = "$Unplayable.<br>After entering 5 more ? rooms, transforms into {{C2|Abundance}}.",
    NoUpgrade = true
  },
  ["Fuel"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Fuel.png",
    Type = "Skill",
    Rarity = "Token",
    Text = "Gain [@CE|@CE@CE].<br>$Exhaust."
  },
  ["Giant Rock"] = {
    Cost = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-GiantRock.png",
    Type = "Attack",
    Rarity = "Token",
    Text = "Deal [20|24] damage."
  },
  ["Luminesce"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Luminesce.png",
    Type = "Skill",
    Rarity = "Token",
    Text = "$Retain.<br>Gain [@CE@CE|@CE@CE@CE].<br>$Exhaust."
  },
  ["Minion Dive Bomb"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-MinionDiveBomb.png",
    Type = "Attack",
    Rarity = "Token",
    Text = "Deal [13|16] damage.<br>$Exhaust."
  },
  ["Minion Sacrifice"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-MinionSacrifice.png",
    Type = "Skill",
    Rarity = "Token",
    Text = "Gain [7|10] $Block.<br>$Exhaust."
  },
  ["Minion Strike"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-MinionStrike.png",
    Type = "Attack",
    Rarity = "Token",
    Text = "Deal [6|9] damage.<br>Draw 1 card.<br>$Exhaust."
  },
  ["Shiv"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Shiv.png",
    Type = "Attack",
    Rarity = "Token",
    Text = "Deal [4|6] damage.<br>$Exhaust."
  },
  ["Soul"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-Soul.png",
    Type = "Skill",
    Rarity = "Token",
    Text = "Draw [2|3] cards.<br>$Exhaust."
  },
  ["Sovereign Blade"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Colorless",
    Image = "StS2_Colorless-SovereignBlade.png",
    Type = "Attack",
    Rarity = "Token",
    Text = "$Retain.<br>Deal 10 damage."
  },
  ["Sweeping Gaze"] = {
    Cost = 0,
    Color = "Colorless",
    Image = "StS2_Colorless-SweepingGaze.png",
    Type = "Attack",
    Rarity = "Token",
    Text = "$Ethereal.<br>Osty deals [10|15] damage to a random enemy.<br>$Exhaust."
  },
  -- Trash Heap cards
  ["Clash"] = {
    Cost = 0,
    Color = "Colorless",
    OverrideColor = "Ironclad",
    Image = "StS2_Ironclad-Clash.png",
    Type = "Attack",
    Rarity = "Event",
    Text = "Can only be played if every card in your Hand is an Attack.<br>Deal [14|18] damage."
  },
  ["Dual Wield"] = {
    Cost = 1,
    Color = "Colorless",
    OverrideColor = "Ironclad",
    Image = "StS2_Ironclad-DualWield.png",
    Type = "Skill",
    Rarity = "Event",
    Text = "Choose an Attack or Power card. Add [a copy|2 copies] of that card into your Hand."
  },
  ["Entrench"] = {
    Cost = 2,
    CostPlus = 1,
    Color = "Colorless",
    OverrideColor = "Ironclad",
    Image = "StS2_Ironclad-Entrench.png",
    Type = "Skill",
    Rarity = "Event",
    Text = "Double your $Block."
  },
  ["Caltrops"] = {
    Cost = 1,
    Color = "Colorless",
    OverrideColor = "Silent",
    Image = "StS2_Silent-Caltrops.png",
    Type = "Power",
    Rarity = "Event",
    Text = "Whenever you are attacked, deal [3|5] damage back."
  },
  ["Distraction"] = {
    Cost = 1,
    CostPlus = 0,
    Color = "Colorless",
    OverrideColor = "Silent",
    Image = "StS2_Silent-Distraction.png",
    Type = "Skill",
    Rarity = "Event",
    Text = "Add a random Skill into your Hand. It's free to play this turn.<br>$Exhaust."
  },
  ["Outmaneuver"] = {
    Cost = 1,
    Color = "Colorless",
    OverrideColor = "Silent",
    Image = "StS2_Silent-Outmaneuver.png",
    Type = "Skill",
    Rarity = "Event",
    Text = "Next turn, gain [@SE@SE|@SE@SE@SE]."
  },
  ["Hello World"] = {
    Cost = 1,
    Color = "Colorless",
    OverrideColor = "Defect",
    Image = "StS2_Defect-HelloWorld.png",
    Type = "Power",
    Rarity = "Event",
    Text = "[|$Innate.<br>]At the start of your turn, add a random Common card into your Hand."
  },
  ["Rebound"] = {
    Cost = 1,
    Color = "Colorless",
    OverrideColor = "Defect",
    Image = "StS2_Defect-Rebound.png",
    Type = "Attack",
    Rarity = "Event",
    Text = "Deal [9|12] damage.<br>Put the next card you play this turn on top of your Draw Pile."
  },
  ["Rip and Tear"] = {
    Cost = 1,
    Color = "Colorless",
    OverrideColor = "Defect",
    Image = "StS2_Defect-RipandTear.png",
    Type = "Attack",
    Rarity = "Event",
    Text = "Deal [7|9] damage to a random enemy twice."
  },
  ["Stack"] = {
    Cost = 1,
    Color = "Colorless",
    OverrideColor = "Defect",
    Image = "StS2_Defect-Stack.png",
    Type = "Skill",
    Rarity = "Event",
    Text = "Gain $Block equal to the number of cards in your Discard Pile[| +3]."
  },
  ["Wither"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Colorless-Wither.png",
    Type = "Status",
    Rarity = "Status",
    Text = "$Unplayable.<br>At the end of your turn, if this is in your Hand, take [3|6] damage."
  },
  ["Wither (Upgraded)"] = {
    Cost = -2,
    Color = "Colorless",
    Image = "StS2_Colorless-Wither-Plus.png",
    Type = "Status",
    Rarity = "Status",
    Text = "$Unplayable.<br>At the end of your turn, if this is in your Hand, take [3|6] damage.",
    Traits = {NoList=true}
  },
}

local formatted = {}
for name, card in pairs(all_data) do
	card.EditLink = "Module:Cards/StS2_data/Colorless"
	formatted[name] = card
end

return formatted