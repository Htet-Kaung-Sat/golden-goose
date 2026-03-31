"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Users.account already has unique index from createTable (unique: true)
    await queryInterface.addIndex("Users", ["creator_account"], {
      name: "idx_users_creator_account",
    });
    await queryInterface.addIndex("Users", ["role_id"], {
      name: "idx_users_role_id",
    });
    await queryInterface.addIndex("GameSessions", ["desk_id", "status"], {
      name: "idx_game_sessions_desk_status",
    });
    await queryInterface.addIndex("GameRounds", ["session_id"], {
      name: "idx_game_rounds_session_id",
    });
    await queryInterface.addIndex("BetResults", ["bet_id"], {
      name: "idx_bet_results_bet_id",
    });
    await queryInterface.addIndex("BetResults", ["bet_id", "cancel_flg"], {
      name: "idx_bet_results_bet_cancel",
    });
    await queryInterface.addIndex("BetResults", ["result_id"], {
      name: "idx_bet_results_result_id",
    });
    await queryInterface.addIndex("Transactions", ["user_id", "createdAt"], {
      name: "idx_transactions_user_created",
    });
    await queryInterface.addIndex("Transactions", ["bet_result_id"], {
      name: "idx_transactions_bet_result_id",
    });
    await queryInterface.addIndex("RoundResults", ["round_id"], {
      name: "idx_round_results_round_id",
    });
    await queryInterface.addIndex("Bets", ["round_id", "user_id"], {
      name: "idx_bets_round_user",
    });
    await queryInterface.addIndex("Bets", ["user_id"], {
      name: "idx_bets_user_id",
    });
    await queryInterface.addIndex("NiuniuRounds", ["game_round_id"], {
      name: "idx_niuniu_rounds_game_round_id",
    });
    await queryInterface.addIndex("NiuniuPlayerHands", ["niuniu_round_id"], {
      name: "idx_niuniu_player_hands_niuniu_round_id",
    });
    await queryInterface.addIndex("LoginInfos", ["user_id"], {
      name: "idx_login_infos_user_id",
    });
    await queryInterface.addIndex("LoginInfos", ["serial_number"], {
      name: "idx_login_infos_serial_number",
    });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex("Users", "idx_users_creator_account");
    await queryInterface.removeIndex("Users", "idx_users_role_id");
    await queryInterface.removeIndex(
      "GameSessions",
      "idx_game_sessions_desk_status",
    );
    await queryInterface.removeIndex(
      "GameRounds",
      "idx_game_rounds_session_id",
    );
    await queryInterface.removeIndex("BetResults", "idx_bet_results_bet_id");
    await queryInterface.removeIndex(
      "BetResults",
      "idx_bet_results_bet_cancel",
    );
    await queryInterface.removeIndex("BetResults", "idx_bet_results_result_id");
    await queryInterface.removeIndex(
      "Transactions",
      "idx_transactions_user_created",
    );
    await queryInterface.removeIndex(
      "Transactions",
      "idx_transactions_bet_result_id",
    );
    await queryInterface.removeIndex(
      "RoundResults",
      "idx_round_results_round_id",
    );
    await queryInterface.removeIndex("Bets", "idx_bets_round_user");
    await queryInterface.removeIndex("Bets", "idx_bets_user_id");
    await queryInterface.removeIndex(
      "NiuniuRounds",
      "idx_niuniu_rounds_game_round_id",
    );
    await queryInterface.removeIndex(
      "NiuniuPlayerHands",
      "idx_niuniu_player_hands_niuniu_round_id",
    );
    await queryInterface.removeIndex("LoginInfos", "idx_login_infos_user_id");
    await queryInterface.removeIndex(
      "LoginInfos",
      "idx_login_infos_serial_number",
    );
  },
};
