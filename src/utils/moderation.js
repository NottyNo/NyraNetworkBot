/**
 * Shared safety checks for moderation commands.
 * Returns an error message string, or null if the action is allowed.
 *
 * @param interaction   the command interaction
 * @param targetUser    the User being moderated
 * @param member        the GuildMember of the target (null if not in the server)
 * @param botCanAct     whether the bot can act on the member (member.bannable, .moderatable, ...)
 */
function getTargetError(interaction, targetUser, member, botCanAct = true) {
    if (targetUser.id === interaction.user.id) {
        return 'You cannot do that to yourself.';
    }
    if (targetUser.id === interaction.client.user.id) {
        return 'You cannot do that to me.';
    }

    if (member) {
        if (member.id === interaction.guild.ownerId) {
            return 'You cannot do that to the server owner.';
        }

        const invokerIsOwner = interaction.user.id === interaction.guild.ownerId;
        if (!invokerIsOwner && member.roles.highest.comparePositionTo(interaction.member.roles.highest) >= 0) {
            return 'That user has the same or a higher role than you.';
        }

        if (!botCanAct) {
            return 'I cannot do that to this user. Check my permissions and that my role is above theirs.';
        }
    }

    return null;
}

module.exports = { getTargetError };
