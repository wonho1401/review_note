import { db } from "@/db/schema";
import { createId } from "@/util/id";
import type { Archive } from "@/types/domain";

export function listArchives(): Promise<Archive[]> {
  return db.archives.orderBy("createdAt").toArray();
}

export function getArchive(id: string): Promise<Archive | undefined> {
  return db.archives.get(id);
}

export async function createArchive(name: string): Promise<Archive> {
  const archive: Archive = {
    id: createId(),
    name,
    createdAt: Date.now(),
  };
  await db.archives.add(archive);
  return archive;
}

export async function updateArchive(
  id: string,
  changes: Partial<Pick<Archive, "name">>,
): Promise<void> {
  await db.archives.update(id, changes);
}

export async function deleteArchive(id: string): Promise<void> {
  await db.transaction("rw", db.archives, db.questions, async () => {
    await db.questions.where("archiveId").equals(id).delete();
    await db.archives.delete(id);
  });
}
