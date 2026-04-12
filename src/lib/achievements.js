export const BADGES = [
  { id: 'king',     emoji: '👑', label: 'King'        },
  { id: 'fire',     emoji: '🔥', label: 'On Fire'     },
  { id: 'skull',    emoji: '💀', label: 'Slump'       },
  { id: 'flawless', emoji: '🎯', label: 'Flawless'    },
  { id: 'dominant', emoji: '🏆', label: 'Dominant'    },
  { id: 'veteran',  emoji: '⚔️', label: 'Veteran'     },
]

// player must be a rankings object (has elo, wins, losses, games, streak, form, provisional)
export function getAchievements(player, rank) {
  if (!player) return []
  const { wins, losses, games, streak, form, provisional } = player
  const winRate = games > 0 ? wins / games : 0
  const badges = []

  if (rank === 0 && !provisional && games >= 5)
    badges.push(BADGES.find(b => b.id === 'king'))

  if (streak?.type === 'W' && streak.count >= 3)
    badges.push({ ...BADGES.find(b => b.id === 'fire'), label: `${streak.count}-Win Streak` })

  if (streak?.type === 'L' && streak.count >= 3)
    badges.push({ ...BADGES.find(b => b.id === 'skull'), label: `${streak.count}-Loss Slump` })

  if (form?.length === 5 && form.every(f => f === 'W'))
    badges.push(BADGES.find(b => b.id === 'flawless'))

  if (games >= 10 && winRate >= 0.75 && rank !== 0)
    badges.push(BADGES.find(b => b.id === 'dominant'))

  if (games >= 25)
    badges.push(BADGES.find(b => b.id === 'veteran'))

  return badges.filter(Boolean)
}
