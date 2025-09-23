import {
  GameMove,
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove,
} from '../../types/CoveyTownSocket';
import Game from './Game';
import TicTacToeGame from './TicTacToeGame';
import Player from '../../lib/Player';
import InvalidParametersError, {
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  INVALID_MOVE_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  PLAYER_NOT_IN_GAME_MESSAGE,
} from '../../lib/InvalidParametersError';

/**
 * A QuantumTicTacToeGame is a Game that implements the rules of the Tic-Tac-Toe variant described at https://www.smbc-comics.com/comic/tic.
 * This class acts as a controller for three underlying TicTacToeGame instances, orchestrating the "quantum" rules by taking
 * the role of the monitor.
 */
export default class QuantumTicTacToeGame extends Game<
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove
> {
  private _games: { A: TicTacToeGame; B: TicTacToeGame; C: TicTacToeGame };

  private _xScore = 0;

  private _oScore = 0;

  private _moveCount = 0;

  public constructor() {
    super({
      moves: [],
      status: 'WAITING_TO_START',
      xScore: 0,
      oScore: 0,
      publiclyVisible: {
        A: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
        B: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
        C: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
      },
    });
    // Assign the initial value to _games here
    this._games = {
      A: new TicTacToeGame(),
      B: new TicTacToeGame(),
      C: new TicTacToeGame(),
    };
  }

  protected _join(player: Player): void {
    // If a player joins that is already in the game
    if (this.state.x === player.id || this.state.o === player.id) {
      throw new InvalidParametersError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    }
    // updates state with x = playerId if x is not already taken
    if (!this.state.x) {
      this.state = {
        ...this.state,
        x: player.id,
      };

      // joins player 1 to TicTacToe subgames
      Object.values(this._games).forEach(game => {
        game.join(player);
      });

      // else updates o with player id
    } else if (!this.state.o) {
      this.state = {
        ...this.state,
        o: player.id,
      };

      // joins player 2 to TicTacToe subgames
      Object.values(this._games).forEach(game => {
        game.join(player);
      });
    } else {
      throw new InvalidParametersError(GAME_FULL_MESSAGE);
    }

    // Updates status to in progress
    if (this.state.x && this.state.o) {
      this.state = {
        ...this.state,
        status: 'IN_PROGRESS',
      };
    }
  }

  protected _leave(player: Player): void {
    // If a player that is not in the game tries to leave
    if (this.state.x !== player.id && this.state.o !== player.id) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }

    // Incase someone leaves a game in progress, remaining player wins
    if (this.state.status === 'IN_PROGRESS') {
      if (this.state.x === player.id) {
        this.state = {
          ...this.state,
          status: 'OVER',
          winner: this.state.o,
          x: undefined,
        };
      } else {
        this.state = {
          ...this.state,
          status: 'OVER',
          winner: this.state.x,
          o: undefined,
        };
      }
      // Removes player from sub games
      Object.values(this._games).forEach(game => {
        game.leave(player);
      });
    }
    // In case someone leaves while game is waiting for players sets x and o to undefined
    else if (this.state.status === 'WAITING_TO_START') {
      if (this.state.x === player.id) {
        this.state = {
          ...this.state,
          moves: [],
          status: 'WAITING_TO_START',
          xScore: 0,
          oScore: 0,
          publiclyVisible: {
            A: [
              [false, false, false],
              [false, false, false],
              [false, false, false],
            ],
            B: [
              [false, false, false],
              [false, false, false],
              [false, false, false],
            ],
            C: [
              [false, false, false],
              [false, false, false],
              [false, false, false],
            ],
          },
          x: undefined,
          o: undefined,
        };
        // Removes player from subgames
        Object.values(this._games).forEach(game => {
          game.leave(player);
        });
      }
    }
  }

  /**
   * Checks that the given move is "valid": that the it's the right
   * player's turn, that the game is actually in-progress, etc.
   * @see TicTacToeGame#_validateMove
   */
  private _validateMove(move: GameMove<QuantumTicTacToeMove>): void {
    // Selects the subgame
    const targetGame = this._games[move.move.board];

    // If a subgame is over and it is not at 0 moves, Dont allow the move
    if (targetGame.state.status === 'OVER' && targetGame.state.moves.length !== 0) {
      throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
    }

    // A move is valid if the space is empty
    for (const m of targetGame.state.moves) {
      // if any prev move have same board and position then current move is not valid
      const isOccupied = m.col === move.move.col && m.row === move.move.row;
      if (isOccupied) {
        // if current move is publically visable throw Invalid_MOVE_MESSAGE
        if (this.state.publiclyVisible[move.move.board][move.move.row][move.move.col]) {
          throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
        } else if (m.gamePiece === move.move.gamePiece) {
          throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
        }
      }
    }

    // Determine whose turn it is supposed to be.
    const expectedPiece = this._moveCount % 2 === 0 ? 'X' : 'O';

    // Check if the player making the move is the one we expect.
    if (move.move.gamePiece !== expectedPiece) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    }

    // A move is valid only if game is in progress
    if (this.state.status !== 'IN_PROGRESS') {
      throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
    }
  }

  public applyMove(move: GameMove<QuantumTicTacToeMove>): void {
    let isColliding = false;

    // cleans incomming move
    if (move.playerID === this.state.x) {
      move.move.gamePiece = 'X';
    } else {
      move.move.gamePiece = 'O';
    }

    // Validate move
    this._validateMove(move);

    // Selects the subgame
    const targetGame = this._games[move.move.board];

    // Loop to check for collision
    for (const m of targetGame.state.moves) {
      // if any prev move have same board and position then current move is not valid
      const isOccupied = m.col === move.move.col && m.row === move.move.row;
      if (isOccupied) {
        // if current move is not yet publically visable
        if (!this.state.publiclyVisible[move.move.board][move.move.row][move.move.col]) {
          // Update publically visable to True
          this.state.publiclyVisible[move.move.board][move.move.row][move.move.col] = true;

          this._moveCount++;

          // Appends the move to the array of moves in state
          this.state = {
            ...this.state,
            moves: [...this.state.moves, move.move],
          };

          // Use applymove in subgame with 3 blanks to take turn
          this._applyMoveWithBlanks(targetGame, {
            playerID: move.playerID,
            gameID: targetGame.id,
            move: { row: -1, col: -1, board: move.move.board, gamePiece: m.gamePiece },
          });

          // sets colliding flag
          isColliding = true;

          break;
        }
      }
    }

    // If not colliding updates state with new move and subgames
    if (!isColliding) {
      this.state = {
        ...this.state,
        moves: [...this.state.moves, move.move],
      };

      this._moveCount++;
      this._applyMoveWithBlanks(targetGame, move);
    }

    this._checkForWins();
    this._checkForGameEnding();
  }

  /**
   * Applies move to targetgame and adds 2 blank moves to other games for turn management
   */
  private _applyMoveWithBlanks(targetGame: TicTacToeGame, move: GameMove<QuantumTicTacToeMove>) {
    // For each subgame
    Object.values(this._games).forEach(game => {
      if (game.state.status === 'IN_PROGRESS') {
        if (game.id === targetGame.id) {
          // Applies real move
          game._applyMove({
            row: move.move.row,
            col: move.move.col,
            gamePiece: move.move.gamePiece,
          });
          // Applies blanks
        } else {
          game.applyMove({
            playerID: move.playerID,
            gameID: game.id,
            move: { row: -1, col: -1, gamePiece: move.move.gamePiece },
          });
        }
      }
    });
  }

  /**
   * Checks all three sub-games for any new three-in-a-row conditions.
   * Awards points and marks boards as "won" so they can't be played on.
   */
  private _checkForWins(): void {
    let localXScore = 0;
    let localOScore = 0;

    // If a game is over, add score to winner
    Object.values(this._games).forEach(game => {
      if (game.state.status === 'OVER') {
        if (game.state.winner === this.state.x) {
          localXScore++;
        } else if (game.state.winner === this.state.o) {
          localOScore++;
        }
      }
    });

    // Updates state with points
    this.state = {
      ...this.state,
      xScore: localXScore,
      oScore: localOScore,
    };

    this._xScore = localXScore;
    this._oScore = localOScore;
  }

  /**
   * A Quantum Tic-Tac-Toe game ends when no more moves are possible.
   * This happens when all squares on all boards are either occupied or part of a won board.
   */
  private _checkForGameEnding(): void {
    let isOver = true;
    let winner: string | undefined;

    // if all game are over, declare winner
    Object.values(this._games).forEach(game => {
      if (game.state.status !== 'OVER') {
        isOver = false;
      }
    });

    // decide winner
    if (this._xScore > this._oScore) {
      winner = this.state.x;
    } else if (this._xScore < this._oScore) {
      winner = this.state.o;
    } else {
      winner = undefined;
    }

    // update state with status over and winner
    if (isOver) {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner,
      };
    }
  }
}
