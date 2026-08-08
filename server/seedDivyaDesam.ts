import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URL;
const options = {
  family: 4,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

async function seed() {
  const client = new MongoClient(uri, options);
  try {
    await client.connect();
    const db = client.db();
    
    // Check if the 108 divya desam exists
    const existing = await db.collection("divyadesam").findOne({ name: "108 Divya Desams" });
    if (!existing) {
      await db.collection("divyadesam").insertOne({
        name: "108 Divya Desams",
        description: "The 108 Divya Desams are the 108 Vishnu and Lakshmi temples that are mentioned in the works of the Alvars, the poet-saints of the Sri Vaishnava tradition.",
        creatorEmail: "admin@vetrivel.app",
        isGlobalTemplate: true,
        isPublished: true,
        parentListId: null,
        temples: [
          { placeId: "ChIJO3p6E1z4pjoRn4t0S-C3xFI", name: "Sri Ranganathaswamy Temple", coordinates: { lat: 10.8631, lng: 78.6896 }, address: "Srirangam, Tiruchirappalli, Tamil Nadu" },
          { placeId: "ChIJW1B2zCrmUjoRFf3L-gU-ZKw", name: "Sri Venkateswara Swamy Vaari Temple", coordinates: { lat: 13.6833, lng: 79.3475 }, address: "Tirumala, Tirupati, Andhra Pradesh" },
          { placeId: "ChIJsz_e5wB1vjsRn6r-kL2hQW0", name: "Sri Parthasarathy Perumal Temple", coordinates: { lat: 13.0543, lng: 80.2769 }, address: "Triplicane, Chennai, Tamil Nadu" }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log("Seeded 108 Divya Desams");
    } else {
      console.log("Already seeded");
    }
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

seed();
