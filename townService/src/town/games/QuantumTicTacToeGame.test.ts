import { createPlayerForTesting } from '../../TestUtils';
import InvalidParametersError, {
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  INVALID_MOVE_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  PLAYER_NOT_IN_GAME_MESSAGE,
} from '../../lib/InvalidParametersError';
import Player from '../../lib/Player';
import { GameMove, QuantumTicTacToeMove } from '../../types/CoveyTownSocket';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';

describe('QuantumTicTacToeGame', () => {
  let game: QuantumTicTacToeGame;
  let player1: Player;
  let player2: Player;
  let player3: Player;

  beforeEach(() => {
    game = new QuantumTicTacToeGame();
    player1 = createPlayerForTesting();
    player2 = createPlayerForTesting();
    player3 = createPlayerForTesting();
  });

  describe('Constructor', () => {
    it('should initialize with all publiclyVisible cells set to false', () => {
      const { publiclyVisible } = game.state;
      const boards: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];

      // Loop through every single cell of every board.
      for (const board of boards) {
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            // This assertion is highly specific and will fail if any cell is not `false`.
            expect(game.state.publiclyVisible[board][row][col]).toBe(false);
          }
        }
      }

      // Also check that the structure is correct (3 boards, 3x3 grid)
      expect(Object.keys(publiclyVisible).length).toBe(3);
      expect(publiclyVisible.A.length).toBe(3);
      expect(publiclyVisible.A[0].length).toBe(3);
    });
  });

  describe('_join', () => {
    it('should add the first player as X', () => {
      game.join(player1);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toBe('WAITING_TO_START');
    });
    it('Should throw player already in game message', () => {
      game.join(player1);
      expect(() => {
        game.join(player1);
      }).toThrow(PLAYER_ALREADY_IN_GAME_MESSAGE);
    });
    it('Should throw game full message', () => {
      game.join(player1);
      game.join(player2);
      expect(() => {
        game.join(player3);
      }).toThrow(GAME_FULL_MESSAGE);
    });
    it('Should add second player as O and sets status to in_progress', () => {
      game.join(player1);
      game.join(player2);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBe(player2.id);
      expect(game.state.status).toBe('IN_PROGRESS');
    });
  });

  describe('_leave', () => {
    describe('when two players are in the game', () => {
      beforeEach(() => {
        game.join(player1);
        game.join(player2);
      });

      it('should set the game to OVER and declare the O player the winner', () => {
        game.leave(player1);
        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player2.id);
      });

      it('should set the game to OVER and declare the X player the winner', () => {
        game.leave(player2);
        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player1.id);
      });
    });
    describe('when one player is in the game', () => {
      it('when the game is not in progress, it should set the game status to WAITING_TO_START and remove the player', () => {
        game.join(player1);
        expect(game.state.x).toEqual(player1.id);
        expect(game.state.o).toBeUndefined();
        expect(game.state.status).toEqual('WAITING_TO_START');
        expect(game.state.winner).toBeUndefined();
        game.leave(player1);
        expect(game.state.x).toBeUndefined();
        expect(game.state.o).toBeUndefined();
        expect(game.state.status).toEqual('WAITING_TO_START');
        expect(game.state.winner).toBeUndefined();
      });

      it('Should give player not in game message', () => {
        game.join(player1);
        expect(() => {
          game.leave(player2);
        }).toThrow(PLAYER_NOT_IN_GAME_MESSAGE);
      });
    });
  });

  describe('applyMove', () => {
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    const makeMove = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move: GameMove<QuantumTicTacToeMove> = {
        playerID: player.id,
        gameID: game.id,
        move: { board, row, col, gamePiece: player === player1 ? 'X' : 'O' },
      };
      game.applyMove(move);
    };

    it('should place a piece on an empty square', () => {
      makeMove(player1, 'A', 0, 0);
      // @ts-expect-error - private property
      expect(game._games.A._board[0][0]).toBe('X');
      expect(game.state.moves.length).toBe(1);
      expect(game.state.publiclyVisible.A[0][0]).toBe(false);
    });

    describe('Validate move', () => {
      it('should throw an error if the game is not in progress', () => {
        game.leave(player2);
        expect(() => makeMove(player1, 'A', 0, 2)).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
      });

      it('should throw invalid move if the board is won', () => {
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 0, 2); // X -> scores 1 point

        expect(() => makeMove(player2, 'A', 0, 2)).toThrowError(INVALID_MOVE_MESSAGE);
      });

      it('should throw an not your turn error if X goes twice', () => {
        makeMove(player1, 'A', 0, 0); // X
        expect(() => makeMove(player1, 'A', 0, 2)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      });

      it('should throw an not your turn error if X goes twice', () => {
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'A', 0, 1); // O
        expect(() => makeMove(player2, 'A', 0, 2)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      });

      it("should throw an error if 'O' tries to move when it is 'X's turn", () => {
        expect(() => {
          makeMove(player2, 'A', 0, 0);
        }).toThrow(new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE));
      });

      it("should throw an error if 'X' tries to move when it is 'O's turn", () => {
        makeMove(player1, 'A', 0, 0);

        expect(() => {
          makeMove(player1, 'B', 1, 1);
        }).toThrow(new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE));
      });

      // it('Should throw error if clicking on publiclly visiable piece', () => {
      //   // X gets a win on board A
      //   makeMove(player1, 'A', 0, 0); // X
      //   makeMove(player2, 'A', 0, 0); // O -> colliison
      //   makeMove(player1, 'B', 0, 0); // X

      //   // Publically visable piece
      //   expect(() => makeMove(player2, 'A', 0, 0)).toThrowError(INVALID_MOVE_MESSAGE);
      // });
      it('Should throw error if clicking on your own piece', () => {
        // X gets a win on board A
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'A', 0, 0); // O -> colliison

        // Own Piece
        expect(() => makeMove(player1, 'A', 0, 0)).toThrowError(INVALID_MOVE_MESSAGE);
      });
    });

    describe('Collision testing', () => {
      it('should award a point when a player gets three-in-a-row', () => {
        // X gets a win on board A
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'A', 0, 0); // O -> colliison
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 0, 2); // X

        expect(game.state.publiclyVisible.A[0][0]).toBe(true);
        expect(game.state.moves.length).toBe(5);
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);
      });
    });

    describe('scoring and game end', () => {
      it('should award a point when a player gets three-in-a-row', () => {
        // X gets a win on board A
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 0, 2); // X -> scores 1 point

        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);
      });
    });

    describe('a full game simulation', () => {
      it('should correctly handle moves, collisions, scoring, and determine a winner', () => {
        makeMove(player1, 'A', 0, 0); // X places on A[0,0]
        makeMove(player2, 'A', 0, 0); // O collides on A[0,0]. Square becomes public. X's turn is skipped.

        // Assert that the collision was handled correctly
        expect(game.state.publiclyVisible.A[0][0]).toBe(true);

        makeMove(player1, 'A', 1, 1); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 2, 2); // X completes a diagonal on A and scores

        // Assert X's score is now 1
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);

        makeMove(player2, 'B', 1, 1); // O
        makeMove(player1, 'C', 0, 0); // X
        makeMove(player2, 'B', 2, 2); // O completes a diagonal on B and scores

        // Assert scores are now tied 1-1
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(1);

        makeMove(player1, 'C', 1, 1); // X
        makeMove(player2, 'C', 0, 1); // o
        makeMove(player1, 'C', 2, 2); // X

        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player1.id);
        expect(game.state.xScore).toBe(2);
        expect(game.state.oScore).toBe(1);
      });

      it('should award a point when a player gets three-in-a-row, and O should win', () => {
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'A', 0, 0); // O

        expect(game.state.publiclyVisible.A[0][0]).toBe(true);

        makeMove(player1, 'A', 1, 1); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 2, 2); // X completes a diagonal on A and scores

        // Assert X's score is now 1
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);

        makeMove(player2, 'B', 1, 1); // O
        makeMove(player1, 'C', 0, 0); // X
        makeMove(player2, 'B', 2, 2); // O completes a diagonal on B and scores

        // Assert scores are now tied 1-1
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(1);

        makeMove(player1, 'C', 1, 0); // X
        makeMove(player2, 'C', 0, 1); // O
        makeMove(player1, 'C', 0, 1); // X Collision
        makeMove(player2, 'C', 1, 1); // O
        makeMove(player1, 'C', 1, 1); // X collision
        makeMove(player2, 'C', 2, 1); // O completes a column on C and scores the winning point

        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player2.id);
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(2);
      });

      it('should correctly handle moves, collisions, scoring, and determine a tie', () => {
        makeMove(player1, 'A', 0, 0); // X places on A[0,0]
        makeMove(player2, 'A', 0, 0); // O collides on A[0,0]. Square becomes public. X's turn is skipped.

        // Assert that the collision was handled correctly
        expect(game.state.publiclyVisible.A[0][0]).toBe(true);

        makeMove(player1, 'A', 1, 1); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 2, 2); // X completes a diagonal on A and scores

        // Assert X's score is now 1
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);

        makeMove(player2, 'B', 1, 1); // O
        makeMove(player1, 'C', 0, 0); // X
        makeMove(player2, 'B', 2, 2); // O completes a diagonal on B and scores

        // Assert scores are now tied 1-1
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(1);

        makeMove(player1, 'C', 1, 1); // X
        makeMove(player2, 'C', 0, 1); // o
        makeMove(player1, 'C', 2, 1); // X
        makeMove(player2, 'C', 2, 0); // O
        makeMove(player1, 'C', 0, 2); // X
        makeMove(player2, 'C', 2, 2); // O
        makeMove(player1, 'C', 1, 2); // X
        makeMove(player2, 'C', 1, 0); // O

        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(undefined);
        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(1);
      });
    });
  });
});
