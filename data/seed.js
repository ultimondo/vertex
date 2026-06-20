/* =======================================================================
   VERTEX — seed characters (loaded only on first run, then editable & saved)
   All Designation Features / items are verbatim from the Weird West Designation Guide.
   ======================================================================= */
window.Vertex = window.Vertex || {};
Vertex.SEED = [
  {
    id: "seed_mara",
    name: "Mara Quill",
    portrait: null,
    designation: { name: "Blacksmith", tagline: "“Iron bends, but you do not.”", descriptors: "Burly · Stalwart · Hands-on" },
    stats: { red: 4, green: 2, blue: 2 },
    res: { fate: { cur: 6 }, hp: { cur: 3 }, temp: { cur: 0 }, armor: 2 },
    archetypes: [
      { name: "Iron Anchor", tag: "red", points: 3, status: "active", drift: 2, driftMax: 5, tagline: "“The floor is exactly where you put it, and it isn’t going anywhere.”" },
      { name: "Riposte", tag: "green", points: 1, status: "active", drift: 0, driftMax: 5, tagline: "“Wait for the opening. Strike the flaw.”" },
      { name: "Splintered Faith", tag: "blue", points: 1, status: "faltering", drift: 5, driftMax: 5, tagline: "“Break the glass. Bleed a little.”" },
      { name: "Total Devotion", tag: "blue", points: 0, status: "silent", drift: 0, driftMax: 5, tagline: "“Cling to the unbroken light.”" }
    ],
    tethers: [
      { to: "Cassian", status: "active", line: "“The one who knows what I did and stayed anyway.”" },
      { to: "Della", status: "knot", old: "“The steadiest hand at the table.”", line: "“The hand that shakes now — and reaches anyway.”" },
      { to: "Wren", status: "open", line: "“The thing I am most afraid of losing.”" }
    ],
    holds: [
      { line: "“I will not draw a weapon against someone who cannot fight back.”", status: "active", timesHonored: 2, vignetteOwed: false },
      { line: "“I will protect the people of this place for as long as I have the means.”", status: "yielded", timesHonored: 0, vignetteOwed: true }
    ],
    features: [
      { name: "Make Do", type: "major", usesMax: 2, spent: [false, false], desc: "<b>Roll Red:</b> You restore a broken or damaged item without using resources. <b>Make Better:</b> You succeed regardless of your roll, but if you Yee-Haw! you can forgo a Windfall Roll to permanently enhance the item in a manner of your choosing, subject to the Host’s discretion." },
      { name: "Quickforge", type: "minor", usesMax: 2, spent: [false, false], desc: "Choose two weapons wielded by you or an ally. Those weapons gain +1 to their next to-hit rolls until the end of the encounter/scene." },
      { name: "Anvil’s Resolve", type: "passive", desc: "Your reputation as a blacksmith earns respect from craftsmen, merchants, and working folk alike. Those who recognize your trade are more likely to trust your word and look to you for advice. Armor granted by wearable items is twice as effective when worn by you. You always have +1 Armor even when you are not wearing any items that would grant it. This Armor does not need to be repaired and is restored automatically at the end of a combat encounter or scene in which it was lost." }
    ],
    items: [
      { name: "Blacksmith’s Hammer &amp; Tongs", meta: "Weapon · Red-Based · Range 1", flavor: "“Forged in fire and stained with soot, these tools remember every weapon and wound they ever shaped.”" },
      { name: "Leather Apron &amp; Gauntlets", meta: "Wearable", flavor: "“Sturdy protection against heat, sparks, and flying slag.”" },
      { name: "Portable Anvil &amp; Toolkit", meta: "Accessory", flavor: "“A collapsible anvil block plus hammers, chisels, and files. Enables blacksmithing anywhere.”" }
    ],
    biography: ""
  },
  {
    id: "seed_rosa",
    name: "Rosa Delgado",
    portrait: null,
    designation: { name: "Luchador", tagline: "“Fights with fists and flair.”", descriptors: "Strong · Theatrical · Robust" },
    stats: { red: 5, green: 1, blue: 2 },
    res: { fate: { cur: 8 }, hp: { cur: 5 }, temp: { cur: 0 }, armor: 1 },
    archetypes: [
      { name: "Grossly Incandescent", tag: "red", points: 3, status: "active", drift: 2, driftMax: 5, tagline: "“Behold!”" },
      { name: "Conviction", tag: "red", points: 1, status: "active", drift: 0, driftMax: 5, tagline: "“Become the mountain.”" },
      { name: "Vital Celebration", tag: "blue", points: 1, status: "faltering", drift: 5, driftMax: 5, tagline: "“Every breath is a feast, and the world is pouring the wine.”" },
      { name: "Sworn Nemesis", tag: "red", points: 0, status: "retired", drift: 0, driftMax: 5, tagline: "“Something in the dark has a name.”" }
    ],
    tethers: [
      { to: "the Crowd", status: "active", line: "“The only family that never once asked me to take off the mask.”" },
      { to: "Mateo", status: "active", line: "“My brother in the ring, and the one I could never beat.”" },
      { to: "Vargas", status: "open", line: "“The hand that fed me, until I saw what it fed on.”" }
    ],
    holds: [
      { line: "“I will never remove my mask where another soul can see.”", status: "active", timesHonored: 3, vignetteOwed: false },
      { line: "“I will not strike an opponent who has yielded the match.”", status: "active", timesHonored: 1, vignetteOwed: false }
    ],
    features: [
      { name: "El Gran Slam", type: "major", usesMax: 2, spent: [false, false], desc: "<b>Roll Red:</b> You leap into the air and body slam down into the ground at a point up to 8 units away. All enemies within a 3x3 area of the impact take 1 damage and are knocked prone. Prone enemies must spend half their Maximum Movement Speed to stand on their next turn, and until then, the difficulty of to-hit rolls against them is reduced by 1. <b>Golpe del Sol:</b> If you Yee-Haw! you can forgo a Windfall Roll to increase the area of effect to a 5x5 space." },
      { name: "Tendedero del Destino", type: "minor", usesMax: 2, spent: [false, false], desc: "<b>Roll Red:</b> Move up to half your Movement Speed toward an enemy. On impact, deal 1 damage and knock the enemy 6 units directly away from you. If the enemy collides with a large object or a wall, they take 1 additional damage. If the enemy collides with another enemy, both take 1 additional damage." },
      { name: "El Campeón del Regreso", type: "passive", desc: "As a luchador, you fight with righteous zeal, turning every battle into a sacred performance for glory, justice, and spectacle. You may never remove your sacred Luchador Mask. If you do, something horrible will happen. The crowd—whether real or imagined—is always watching. When you are Downed, the Host becomes the referee and begins a ten-count. You must then roll 1d6 at a time as quickly as you can. If you roll two 6s before the count ends, you rise back to 1 HP. If not, you are Downed. Each time you are Downed again in the same combat encounter, the next countdown starts two numbers higher — the second time at 3, the third at 5, and so on." }
    ],
    items: [
      { name: "Wrist Wraps", meta: "Weapon · Red-Based · Range 1", flavor: "“Sweat-soaked and fraying, these old bindings hum with the echoes of fights long finished but never forgotten.”" },
      { name: "Signature Luchador Mask", meta: "Wearable", flavor: "“Distinctive, colorful, and sacred. Never leaves your face…or else.”" },
      { name: "Flashy Costume or Serape", meta: "Accessory", flavor: "“Bold, brilliant, and blinding—meant to dazzle the crowd.”" }
    ],
    biography: ""
  }
];
