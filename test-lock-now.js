const { PrismaClient } = require('@prisma/client')

async function run() {
    const prisma = new PrismaClient()
    const lesson = await prisma.lesson.findFirst()
    if (!lesson) {
        console.log('No lesson found')
        return
    }

    const now = new Date()
    console.log('Now:', now)
    console.log('Now ISO:', now.toISOString())

    if (lesson.lockedUntil) {
        console.log('LockedUntil:', lesson.lockedUntil)
        console.log('LockedUntil ISO:', lesson.lockedUntil.toISOString())
        console.log('Is lockedUntil > now?', lesson.lockedUntil > now)
    } else {
        console.log('No lock on the first lesson.')

        // Simulate setting a lock
        const newLockTime = new Date(now.getTime() + 2 * 60 * 1000) // +2 mins
        await prisma.lesson.update({
            where: { id: lesson.id },
            data: {
                activeEditorId: '1',
                lockedUntil: newLockTime
            }
        })
        console.log('Set lock until:', newLockTime)

        // Fetch it again
        const updated = await prisma.lesson.findUnique({ where: { id: lesson.id } })
        console.log('Fetched LockedUntil:', updated.lockedUntil)
        console.log('Is fetched lock > now?', updated.lockedUntil > new Date())
    }

    prisma.$disconnect()
}

run().catch(console.error)
