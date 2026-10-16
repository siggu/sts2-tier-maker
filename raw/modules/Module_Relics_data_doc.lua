== Overview ==

Data table of all relics/blights with display text and simple metadata for rendering in UI/wiki/tooltips.

== Structure == 
<syntaxhighlight>
["Relic Name"] = {
  Image = "Icon.png",
  Description = "Effect text.",
  Rarity = "Starter | Common | Uncommon | Rare | Shop | Boss | Event | Special | Blight",
  Character = "Optional (Ironclad | Silent | Defect | Watcher | ...)",
  Flavor = "Optional flavor text.",
  ID = "Optional internal alias",
  Link = "Optional wiki link slug",
  -- Optional event-only fields:
  EventName = "Event name",
  EventIcon = "EventIcon.png",
  Event02Name = "...",  -- if present
  Event02Icon = "...",
  -- Optional gating:
  Requirement = { ... }  -- e.g., max_floor=49, not_shop=true, non_screenless=true, deck="Attack|Skill|Power",
                         -- campfire=true, endless=true, blight_chest=true
}
</syntaxhighlight>