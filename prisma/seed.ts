import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed operations...');

  // Competitive Seed Dataset
  const pokemons = [
    {
      name: 'Azumarill',
      types: ['Water', 'Fairy'],
      hp: 100, atk: 50, def: 80, spa: 60, spd: 80, spe: 50,
      usage: { usageRate: 0.124, rank: 18, format: 'gen9ou' },
      abilities: [
        { abilityName: 'Huge Power', percentage: 0.98 },
        { abilityName: 'Sap Sipper', percentage: 0.015 },
        { abilityName: 'Thick Fat', percentage: 0.005 }
      ],
      items: [
        { itemName: 'Sitrus Berry', percentage: 0.65 },
        { itemName: 'Choice Band', percentage: 0.30 },
        { itemName: 'Assault Vest', percentage: 0.05 }
      ],
      moves: [
        { moveName: 'Play Rough', percentage: 0.95 },
        { moveName: 'Liquidation', percentage: 0.90 },
        { moveName: 'Aqua Jet', percentage: 0.99 },
        { moveName: 'Belly Drum', percentage: 0.65 },
        { moveName: 'Superpower', percentage: 0.25 },
        { moveName: 'Ice Spinner', percentage: 0.15 }
      ]
    },
    {
      name: 'Dragonite',
      types: ['Dragon', 'Flying'],
      hp: 91, atk: 134, def: 95, spa: 100, spd: 100, spe: 80,
      usage: { usageRate: 0.185, rank: 5, format: 'gen9ou' },
      abilities: [
        { abilityName: 'Multiscale', percentage: 0.99 },
        { abilityName: 'Inner Focus', percentage: 0.01 }
      ],
      items: [
        { itemName: 'Heavy-Duty Boots', percentage: 0.75 },
        { itemName: 'Lum Berry', percentage: 0.15 },
        { itemName: 'Choice Band', percentage: 0.10 }
      ],
      moves: [
        { moveName: 'Dragon Dance', percentage: 0.85 },
        { moveName: 'Extreme Speed', percentage: 0.90 },
        { moveName: 'Earthquake', percentage: 0.70 },
        { moveName: 'Outrage', percentage: 0.40 },
        { moveName: 'Roost', percentage: 0.60 },
        { moveName: 'Fire Punch', percentage: 0.20 }
      ]
    },
    {
      name: 'Great Tusk',
      types: ['Ground', 'Fighting'],
      hp: 90, atk: 131, def: 131, spa: 53, spd: 53, spe: 87,
      usage: { usageRate: 0.312, rank: 1, format: 'gen9ou' },
      abilities: [
        { abilityName: 'Protosynthesis', percentage: 1.0 }
      ],
      items: [
        { itemName: 'Leftovers', percentage: 0.55 },
        { itemName: 'Heavy-Duty Boots', percentage: 0.25 },
        { itemName: 'Booster Energy', percentage: 0.20 }
      ],
      moves: [
        { moveName: 'Rapid Spin', percentage: 0.92 },
        { moveName: 'Earthquake', percentage: 0.88 },
        { moveName: 'Close Combat', percentage: 0.82 },
        { moveName: 'Stealth Rock', percentage: 0.45 },
        { moveName: 'Ice Spinner', percentage: 0.50 },
        { moveName: 'Knock Off', percentage: 0.35 }
      ]
    },
    {
      name: 'Kingambit',
      types: ['Dark', 'Steel'],
      hp: 100, atk: 135, def: 120, spa: 60, spd: 85, spe: 50,
      usage: { usageRate: 0.245, rank: 3, format: 'gen9ou' },
      abilities: [
        { abilityName: 'Supreme Overlord', percentage: 0.98 },
        { abilityName: 'Defiant', percentage: 0.02 }
      ],
      items: [
        { itemName: 'Black Glasses', percentage: 0.45 },
        { itemName: 'Leftovers', percentage: 0.35 },
        { itemName: 'Lum Berry', percentage: 0.15 }
      ],
      moves: [
        { moveName: 'Kowtow Cleave', percentage: 0.99 },
        { moveName: 'Sucker Punch', percentage: 0.99 },
        { moveName: 'Iron Head', percentage: 0.85 },
        { moveName: 'Swords Dance', percentage: 0.80 },
        { moveName: 'Low Kick', percentage: 0.25 }
      ]
    }
  ];

  for (const p of pokemons) {
    // Delete existing subrelations to ensure fresh re-seeding
    await prisma.pokemonAbility.deleteMany({ where: { speciesName: p.name } });
    await prisma.pokemonItem.deleteMany({ where: { speciesName: p.name } });
    await prisma.pokemonMove.deleteMany({ where: { speciesName: p.name } });

    // Idempotent Upsert for Species
    await prisma.pokemonSpecies.upsert({
      where: { name: p.name },
      update: {
        types: p.types,
        hp: p.hp,
        atk: p.atk,
        def: p.def,
        spa: p.spa,
        spd: p.spd,
        spe: p.spe,
        usage: {
          upsert: {
            create: p.usage,
            update: p.usage
          }
        }
      },
      create: {
        name: p.name,
        types: p.types,
        hp: p.hp,
        atk: p.atk,
        def: p.def,
        spa: p.spa,
        spd: p.spd,
        spe: p.spe,
        usage: {
          create: p.usage
        }
      }
    });

    // Bulk Seed Abilities
    await prisma.pokemonAbility.createMany({
      data: p.abilities.map(a => ({
        speciesName: p.name,
        abilityName: a.abilityName,
        percentage: a.percentage
      }))
    });

    // Bulk Seed Items
    await prisma.pokemonItem.createMany({
      data: p.items.map(i => ({
        speciesName: p.name,
        itemName: i.itemName,
        percentage: i.percentage
      }))
    });

    // Bulk Seed Moves
    await prisma.pokemonMove.createMany({
      data: p.moves.map(m => ({
        speciesName: p.name,
        moveName: m.moveName,
        percentage: m.percentage
      }))
    });

    console.log(`Seeded database profiles for: ${p.name}`);
  }

  console.log('Seed operations finished successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
