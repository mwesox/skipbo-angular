import { interval, of, Subject, merge } from 'rxjs';
import { create as createSpy } from 'rxjs-spy';
import { tag } from 'rxjs-spy/operators';
import { delay, filter, last, mapTo, switchMap, take, tap, withLatestFrom, takeWhile, defaultIfEmpty, takeUntil } from 'rxjs/operators';
import { Game, logger, Player } from 'skipbo-core';
import { naivePlacementStrategyObservable, PlayerTryResult } from './placement-strategy';


createSpy({
  defaultPlugins: false
}).log();


export class SkipboAi {
  private _playTurn = new Subject();

  constructor(private _game: Game) {
    console.log('Skip-Bo AI 🐙 was born 🌟');
  }

  playTurn() {
    logger.info('🐙: I will take this turn');
    this._playTurn.next();
  }

  watch() {
    // allow manual trigger of a human auto turn
    this._playTurn.pipe(
      withLatestFrom(this._game.nextTurn, (_, player) => player),
      switchMap(player => naivePlacementStrategyObservable(player)),
      tag('🐙: Manual Turn triggered')
    ).subscribe();

    // autoplay for non humans
    this._game.newGame$.pipe(
      tag('🐙: New Game started 🆕'),
      switchMap(_ => this._game.nextTurn
          .pipe(
            filter(player => player.isCPU ),
            delay(250),
            tag('CPU Player takes turn - implement play here 🔽'),
            switchMap(player =>
                interval(50).pipe(
                  tag('📖 intervalcounter'),
                  switchMap(__ => naivePlacementStrategyObservable(player)),
                  takeWhile( (result: PlayerTryResult) => result.cardPlayed),
                  mapTo(player),
                  defaultIfEmpty(player),
                  last()
                )
            ),
            takeUntil(merge(this._game.abort$, this._game.gameOver$)),
            tap((player: Player) => player.discardHandCard())
          )
      )
    ).subscribe();

    // gameover signal
    this._game.gameOver$.pipe(
      tag('🐙: Game just finished 🏅')
    ).subscribe();

    // game abort signal;
    this._game.abort$.pipe(
      tag('🐙: Game just aborted ⏹')
    ).subscribe();
  }
}
